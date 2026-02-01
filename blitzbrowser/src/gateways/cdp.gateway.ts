import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { BrowserInstance, ConnectionOptions, ConnectionOptionsEvent } from 'src/components/browser-instance.component';
import { BrowserPoolService } from 'src/services/browser-pool.service';
import { WebSocket } from 'ws';
import z from 'zod';
import { Message, Tunnel } from '@blitzbrowser/tunnel';
import { MaxBrowserReachedError } from 'src/errors/max-browser-reached.error';

export const PROXY_URL_QUERY_PARAM = 'proxyUrl';
export const TIMEZONE_QUERY_PARAM = 'timezone';
export const USER_DATA_ID_QUERY_PARAM = 'userDataId';
export const USER_DATA_READ_ONLY_QUERY_PARAM = 'userDataReadOnly';
export const LIVE_VIEW_QUERY_PARAM = 'liveView';

const ConnectionOptionQueryParams = z.object({
  proxy_url: z.url().optional(),
  timezone: z.string().optional(),
  user_data_id: z.string().optional(),
  user_data_read_only: z.boolean().optional().default(false),
  live_view: z.boolean().optional().default(false),
});

type ConnectionOptionQueryParams = z.infer<typeof ConnectionOptionQueryParams>;

@Injectable()
export class CDPWebSocketGateway implements OnModuleDestroy {

  private static readonly WAITING_BROWSER_TIMEOUT_MS = 10_000;

  static readonly INTERNAL_SERVER_ERROR_CODE = 4000;
  static readonly BAD_REQUEST_CODE = 4002;
  static readonly NO_BROWSER_INSTANCE_AVAILABLE = 4003;

  readonly #logger = new Logger(CDPWebSocketGateway.name);

  constructor(
    private readonly browser_pool_service: BrowserPoolService,
  ) { }

  onModuleDestroy() {
    this.browser_pool_service.shutdown();
  }

  async connectCDP(cdp_websocket_client: WebSocket, url: URL) {
    let tunnel: Tunnel;

    try {
      const parsed_connection_options = this.#parseConnectionOptionQueryParams(url);

      if (!parsed_connection_options.success) {
        cdp_websocket_client.close(CDPWebSocketGateway.BAD_REQUEST_CODE, parsed_connection_options.error.message.trim());
        return;
      }

      tunnel = new Tunnel();

      tunnel.on('message', message => {
        if (message.channel_id === BrowserInstance.CDP_CHANNEL_ID) {
          cdp_websocket_client.send(message.data.toString('utf8'), { binary: false });
        }
      });

      tunnel.once('closed', () => {
        cdp_websocket_client.close();
      })

      cdp_websocket_client.on('message', message => {
        tunnel.receiveMessage(Message.of(BrowserInstance.CDP_CHANNEL_ID, message.toString('utf8')));
      });

      const browser_instance: BrowserInstance = await this.#getBrowserInstance();

      const ping_interval_id = setInterval(() => {
        cdp_websocket_client.ping();
      }, 3000);

      cdp_websocket_client.on('close', () => {
        clearInterval(ping_interval_id);
        tunnel.close();
      });

      cdp_websocket_client.on('error', err => {
        this.#logger.error(`Error with cdp websocket.`, err?.stack || err);
      });

      browser_instance.connectTunnel(tunnel);

      tunnel.receiveMessage(Message.of(BrowserInstance.EVENT_CHANNEL_ID, JSON.stringify({
        type: 'CONNECTION_OPTIONS',
        options: {
          proxy_url: parsed_connection_options.data.proxy_url,
          timezone: parsed_connection_options.data.timezone,
          user_data_id: parsed_connection_options.data.user_data_id,
          user_data_read_only: parsed_connection_options.data.user_data_read_only,
          vnc_enabled: parsed_connection_options.data.live_view === true,
        } satisfies ConnectionOptions
      } satisfies ConnectionOptionsEvent)));

      this.#logger.log('Sent connection options');
    } catch (e) {
      if (e instanceof MaxBrowserReachedError) {
        tunnel.close();
        cdp_websocket_client.close(CDPWebSocketGateway.NO_BROWSER_INSTANCE_AVAILABLE, 'No browser instance available.');
        return;
      }

      this.#logger.error(`Error while handling client websocket.`, e?.stack || e)

      cdp_websocket_client.close(CDPWebSocketGateway.INTERNAL_SERVER_ERROR_CODE, e?.stack || e);
      return;
    }
  }

  async #getBrowserInstance(): Promise<BrowserInstance> {
    const start = Date.now();

    while (start + CDPWebSocketGateway.WAITING_BROWSER_TIMEOUT_MS > Date.now()) {
      try {
        const browser_instance = this.browser_pool_service.createBrowserInstance();

        if (browser_instance) {
          return browser_instance;
        }
      } catch (e) {
        if (e instanceof MaxBrowserReachedError) {
          await new Promise((resolve) => {
            setTimeout(resolve, 100);
          });
          continue;
        } else {
          throw e;
        }
      }
    }

    throw new MaxBrowserReachedError();
  }

  #parseConnectionOptionQueryParams(url: URL) {
    return ConnectionOptionQueryParams.safeParse({
      timezone: this.getQueryParamValue(TIMEZONE_QUERY_PARAM, url),
      proxy_url: this.getQueryParamValue(PROXY_URL_QUERY_PARAM, url),
      user_data_id: this.getQueryParamValue(USER_DATA_ID_QUERY_PARAM, url),
      user_data_read_only: this.getQueryParamValue(USER_DATA_READ_ONLY_QUERY_PARAM, url)?.toLowerCase() === 'true',
      live_view: this.getQueryParamValue(LIVE_VIEW_QUERY_PARAM, url)?.toLowerCase() === 'true',
    });
  }

  private getQueryParamValue(param: string, url: URL) {
    return url.searchParams.has(param) ? url.searchParams.get(param) : undefined;
  }

}