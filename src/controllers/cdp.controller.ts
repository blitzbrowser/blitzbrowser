import { Controller, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { BrowserInstance, ConnectionOptionsEvent } from 'src/components/browser-instance.component';
import { BrowserPoolService } from 'src/services/browser-pool.service';
import { WebSocketServer } from 'ws';
import z from 'zod';
import { Message, Tunnel } from '@blitzbrowser/tunnel';
import { MaxBrowserReachedError } from 'src/errors/max-browser-reached.error';

export const PROXY_URL_QUERY_PARAM = 'proxyUrl';
export const TIMEZONE_QUERY_PARAM = 'timezone';
export const USER_DATA_ID_QUERY_PARAM = 'userDataId';
export const USER_DATA_READ_ONLY_QUERY_PARAM = 'userDataReadOnly';

const ConnectionOptionQueryParams = z.object({
  proxy_url: z.url().optional(),
  timezone: z.string().optional(),
  user_data_id: z.string().optional(),
  user_data_read_only: z.boolean().optional().default(false),
});

type ConnectionOptionQueryParams = z.infer<typeof ConnectionOptionQueryParams>;

@Controller()
export class CDPController implements OnModuleInit {

  private static readonly WAITING_BROWSER_TIMEOUT_MS = 10_000;

  static readonly INTERNAL_SERVER_ERROR_CODE = 4000;
  static readonly BAD_REQUEST_CODE = 4002;
  static readonly NO_BROWSER_INSTANCE_AVAILABLE = 4003;

  readonly #logger = new Logger(CDPController.name);

  constructor(
    private readonly browser_pool_service: BrowserPoolService,
    private readonly http_adapter_host: HttpAdapterHost,
  ) { }

  async onModuleInit() {
    const websocket_server = new WebSocketServer({ server: (this.http_adapter_host.httpAdapter as ExpressAdapter).getHttpServer() });

    websocket_server.on('connection', async (cdp_websocket_client, req) => {
      let tunnel: Tunnel;

      try {
        const url = new URL(`http://127.0.0.1${req.url}`);
        const parsed_connection_options = this.#parseConnectionOptionQueryParams(url);

        if (!parsed_connection_options.success) {
          cdp_websocket_client.close(CDPController.BAD_REQUEST_CODE, parsed_connection_options.error.message.trim());
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
            ...parsed_connection_options.data
          }
        } satisfies ConnectionOptionsEvent)));

        this.#logger.log('Sent connection options');
      } catch (e) {
        if (e instanceof MaxBrowserReachedError) {
          tunnel.close();
          cdp_websocket_client.close(CDPController.NO_BROWSER_INSTANCE_AVAILABLE, 'No browser instance available.');
          return;
        }

        this.#logger.error(`Error while handling client websocket.`, e?.stack || e)

        cdp_websocket_client.close(CDPController.INTERNAL_SERVER_ERROR_CODE, e?.stack || e);
        return;
      }
    });

    websocket_server.once('close', () => {
      this.browser_pool_service.shutdown();
    });

    websocket_server.once('error', (err) => {
      this.#logger.error('Error with server websocket.', err?.stack || err);
      this.browser_pool_service.shutdown();
    });
  }

  async #getBrowserInstance(): Promise<BrowserInstance> {
    const start = Date.now();

    while (start + CDPController.WAITING_BROWSER_TIMEOUT_MS > Date.now()) {
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
    });
  }

  private getQueryParamValue(param: string, url: URL) {
    return url.searchParams.has(param) ? url.searchParams.get(param) : undefined;
  }

}