import { Logger } from '@nestjs/common';
import { ChildProcess, spawn } from 'child_process';
import * as ProxyChain from 'proxy-chain';
import * as EventEmitter from 'events';
import { WebSocket } from 'ws';
import { Channel, Tunnel } from '@blitzbrowser/tunnel';
import { ModuleRef } from '@nestjs/core';
import { UserDataService } from 'src/services/user-data.service';
import * as fsPromise from 'fs/promises';
import { TimezoneService } from 'src/services/timezone.service';
import { BrowserPoolService, BrowserPoolStatus } from 'src/services/browser-pool.service';

interface Stats {
  trgRxBytes: number;
  trgTxBytes: number;
}

class PortPool {

  #next_port_to_claim = 13000;

  readonly #available_ports: number[] = [];

  constructor(starting_port: number) {
    this.#next_port_to_claim = starting_port;
  }

  getAvailablePort() {
    if (this.#available_ports.length === 0) {
      return this.#next_port_to_claim++;
    }

    return this.#available_ports.shift();
  }

  releasePort(port: number) {
    if (typeof port !== 'number') {
      return;
    }

    this.#available_ports.push(port);
  }

}

interface BrowserInstanceEvents {
  cdp_terminated: [];
  terminated: [];
}

export interface ConnectionOptions {
  timezone?: string;
  proxy_url?: string;
  user_data_id?: string;
  user_data_read_only?: boolean;
  vnc_enabled: boolean;
}

/**
 * Connection Options to use to launch the browser instance
 */
export interface ConnectionOptionsEvent {
  type: 'CONNECTION_OPTIONS';
  options: ConnectionOptions;
}

/**
 * Request to terminate the CDP.
 */
export interface CDPCloseEvent {
  type: 'CDP_CLOSE';
}

/**
 * CDP connection is terminated.
 */
export interface CDPTerminatedEvent {
  type: 'CDP_TERMINATED';
  status: BrowserInstanceStatus;
}

/**
 * Browser instance status update
 */
export interface BrowserInstanceStatusEvent {
  type: 'BROWSER_INSTANCE_STATUS';
  status: BrowserInstanceStatus;
}

export interface BrowserInstanceRequestEvent {
  type: 'BROWSER_INSTANCE_REQUEST';
  url: string;
  bytes_downloaded: number;
  bytes_uploaded: number;
  created_at: string;
}

export type BrowserInstanceEvent = ConnectionOptionsEvent | CDPCloseEvent | CDPTerminatedEvent | BrowserInstanceStatusEvent | BrowserInstanceRequestEvent;

export interface BrowserInstanceStatus {
  id: string;

  vnc_enabled: boolean;

  browser_pool: BrowserPoolStatus;

  // Order of events that should happen in happy path
  connected_at: string | undefined;
  preparation_tasks_started_at: string | undefined;
  browser_process_launching_at: string | undefined;
  browser_process_launched_at: string | undefined;
  browser_process_cdp_connected_at: string | undefined;
  browser_process_cdp_terminated_at: string | undefined;
  completion_tasks_started_at: string | undefined;

  // Can happen anytime
  cdp_close_event_at: string | undefined;
}

export class BrowserInstance extends EventEmitter<BrowserInstanceEvents> {

  static readonly CDP_CHANNEL_ID = 2;
  static readonly EVENT_CHANNEL_ID = 3;

  static #PORT_POOL = new PortPool(13000);

  readonly #logger: Logger;

  readonly #browser_pool_service: BrowserPoolService;

  #browser_instance_process: ChildProcess;

  #proxy_server: ProxyChain.Server;

  #cdp_websocket: WebSocket;

  #connected_at: string | undefined;
  #preparation_tasks_started_at: string | undefined;
  #browser_process_launching_at: string | undefined;
  #browser_process_launched_at: string | undefined;
  #browser_process_cdp_connected_at: string | undefined;
  #browser_process_cdp_terminated_at: string | undefined;
  #completion_tasks_started_at: string | undefined;
  #cdp_close_event_at: string | undefined;

  readonly #user_data_folder: string;

  #connection_options: ConnectionOptions | undefined;

  #tunnel: Tunnel;
  #event_channel: Channel;
  #cdp_channel: Channel;

  #timezone: string;

  #cdp_port: number;
  #vnc_port: number;

  constructor(
    readonly id: string,
    readonly module_ref: ModuleRef
  ) {
    super();
    this.#browser_pool_service = this.module_ref.get(BrowserPoolService);
    this.#logger = new Logger(`${BrowserInstance.name}|${id}`);
    this.#user_data_folder = `/home/pptruser/user-data/${id}`;
  }

  get vnc_enabled() {
    return this.#connection_options?.vnc_enabled === true;
  }

  get vnc_port() {
    return this.#vnc_port;
  }

  get in_use() {
    return typeof this.#connected_at === 'string';
  }

  get cdp_terminated() {
    return typeof this.#browser_process_cdp_terminated_at === 'string';
  }

  connectTunnel(tunnel: Tunnel) {
    if (this.in_use) {
      throw new Error(`Browser instance ${this.id} is already in use.`);
    }

    this.#connected_at = new Date().toISOString();
    this.#tunnel = tunnel;

    this.#tunnel.on('closed', () => {
      this.#logger.log('Tunnel closed');
      this.close();
    })

    this.#logger.log('Connecting tunnel.');

    this.#event_channel = this.#tunnel.createChannel(BrowserInstance.EVENT_CHANNEL_ID, async (data) => {
      const event: BrowserInstanceEvent = JSON.parse(data.toString('utf8'));

      switch (event.type) {
        case 'CONNECTION_OPTIONS':
          this.#connection_options = event.options;
          this.#startPreparationTasks();
          break;
        case 'CDP_CLOSE':
          this.#cdp_close_event_at = new Date().toISOString();
          this.#logger.log('Received CDP Close event');
          this.close();
          break;
      }
    });

    this.#sendBrowserInstanceStatus();

    this.once('cdp_terminated', () => {
      this.#sendBrowserInstanceStatus();
      this.#event_channel.send(JSON.stringify({ type: 'CDP_TERMINATED', status: this.status } satisfies CDPTerminatedEvent));
      this.#logger.log('CDP terminated, will now close.')
      this.close();
    });

    this.once('terminated', () => {
      // Release after terminated. We need to make sure the browser process is killed before reusing the port. Preventing collision.
      BrowserInstance.#PORT_POOL.releasePort(this.#cdp_port);
      BrowserInstance.#PORT_POOL.releasePort(this.#vnc_port);

      this.#logger.log('Released ports');

      this.#sendBrowserInstanceStatus();
      this.#tunnel.close();

      this.#logger.log('Closed tunnel.');
    });
  }

  async #startPreparationTasks() {
    try {
      this.#preparation_tasks_started_at = new Date().toISOString();

      this.#logger.log('Starting preparation tasks');

      await fsPromise.mkdir(this.#user_data_folder, { recursive: true });

      this.#cdp_port = BrowserInstance.#PORT_POOL.getAvailablePort();
      this.#vnc_port = BrowserInstance.#PORT_POOL.getAvailablePort();

      await Promise.all([
        this.#startProxyServer(),
        this.#updateTimezone(),
        (async () => {
          if (this.#connection_options?.user_data_id) {
            await this.#downloadUserData();
          }
        })()
      ]);

      await this.#launchProcess();

      this.#sendBrowserInstanceStatus();
    } catch (e) {
      this.#logger.error('Error while doing preparation tasks', e?.stack || e);
      this.close();
    }
  }

  async #downloadUserData() {
    if (!this.#connection_options.user_data_id) {
      return;
    }

    await this.module_ref.get(UserDataService).downloadUserData(
      this.#connection_options.user_data_id,
      this.#user_data_folder
    );
  }

  readonly #proxy_connections: { [connection_id: number]: { url: string; } } = {};

  async #startProxyServer() {
    if (this.#proxy_server) {
      return;
    }

    return new Promise((res, rej) => {
      this.#proxy_server = new ProxyChain.Server({
        port: 0,
        host: '127.0.0.1',
        verbose: false,
        prepareRequestFunction: async ({ request, connectionId }) => {
          this.#proxy_connections[connectionId] = { url: request.url };

          if (!this.in_use || !this.#connection_options?.proxy_url) {
            return {};
          }

          return {
            upstreamProxyUrl: this.#connection_options.proxy_url
          };
        },
      });

      this.#proxy_server.listen((err) => {
        if (err) {
          rej(err);
          return;
        }

        this.#proxy_server.on('connectionClosed', ({ connectionId, stats }: { connectionId: number; stats: Stats }) => {
          if (this.#event_channel) {
            const proxy_connection = this.#proxy_connections[connectionId];

            if (proxy_connection) {
              this.#event_channel.send(JSON.stringify({
                type: 'BROWSER_INSTANCE_REQUEST',
                url: proxy_connection.url,
                bytes_downloaded: stats.trgRxBytes,
                bytes_uploaded: stats.trgTxBytes,
                created_at: new Date().toISOString()
              } satisfies BrowserInstanceRequestEvent));
            }
          }

          delete this.#proxy_connections[connectionId];
        });

        res(undefined);
      });
    });
  }

  async #updateTimezone() {
    if (this.#connection_options?.timezone) {
      this.#timezone = this.#connection_options.timezone;
    } else if (this.#connection_options?.proxy_url) {
      this.#timezone = await this.module_ref.get(TimezoneService).getProxyTimezone(this.#connection_options.proxy_url);
    } else {
      this.#timezone = await this.module_ref.get(TimezoneService).getDefaultTimezone();
    }
  }

  async close() {
    if (typeof this.#completion_tasks_started_at === 'string') {
      return;
    }

    this.#completion_tasks_started_at = new Date().toISOString();

    this.#sendBrowserInstanceStatus();

    this.#logger.log('Starting completion tasks.');

    if (this.#isBrowserProcessAlive()) {
      this.#logger.log('Killing process');

      try {
        await new Promise((res) => {
          this.#browser_instance_process.once('exit', () => {
            res(undefined);
          });

          this.#browser_instance_process.kill();
        });
      } catch (e) {
        this.#logger.error('Error while killing process', e?.stack);
      }
    } else {
      this.#logger.log('Process already killed.');
    }

    if (this.#cdp_websocket) {
      this.#logger.log('Closing cdp websocket.');
      this.#cdp_websocket.close();
    }

    if (this.#proxy_server) {
      this.#logger.log('Closing proxy server.');
      try {
        await this.#proxy_server.close(true);
      } catch (e) {
        this.#logger.error('Error while closing proxy server', e?.stack);
      }
    }

    try {
      await this.#uploadUserData();
    } catch (e) {
      this.#logger.error('Error while uploading user data', e?.stack || e);
    }

    try {
      this.#logger.log('Deleting user data.');
      await fsPromise.rm(this.#user_data_folder, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    } catch (e) {
      this.#logger.error('Error while deleting user data', e?.stack || e);
    }

    this.#logger.log('Completion tasks terminated.');
    this.emit('terminated');
  }

  async #uploadUserData() {
    if (!this.#connection_options?.user_data_id || this.#connection_options?.user_data_read_only === true) {
      return;
    }

    this.#logger.log('Uploading user data.');

    await this.module_ref.get(UserDataService).uploadUserData(
      this.#connection_options.user_data_id,
      this.#user_data_folder
    );
  }

  async #launchProcess() {
    this.#browser_process_launching_at = new Date().toISOString();

    this.#browser_instance_process = spawn(
      `tini`,
      ['-s', `--`, `node`, `${__dirname}/../../dist/components/browser-instance.process.js`],
      {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          DISPLAY_ID: `${this.#cdp_port}`,
          CDP_PORT: `${this.#cdp_port}`,
          VNC_PORT: `${this.#vnc_port}`,
          VNC_ENABLED: `${this.vnc_enabled}`,
          PROXY_SERVER_PORT: `${this.#proxy_server.port}`,
          USER_DATA_FOLDER: this.#user_data_folder,
          TZ: this.#timezone
        }
      }
    );

    this.#browser_instance_process.stdout.on('data', (data) => {
      (data.toString() as string).split('\n').map(s => s.trim()).filter(s => s !== '').forEach(log => {
        this.#logger.log(`stdout: ${log}`);
      })
    });
    this.#browser_instance_process.stderr.on('data', (data) => {
      (data.toString() as string).split('\n').map(s => s.trim()).filter(s => s !== '').forEach(log => {
        this.#logger.error(`stderr: ${log}`);
      })
    });

    await new Promise((res, rej) => {
      this.#browser_instance_process.on('spawn', () => {
        this.#logger.log('Process spawned');
        res(undefined);
      });
      this.#browser_instance_process.on('error', err => {
        rej(err);
      })
    });

    this.#browser_process_launched_at = new Date().toISOString();

    this.#logger.log('Process launched');

    this.#browser_instance_process.once('exit', (e, i) => {
      this.#logger.log(`Process exited ${e} ${i}`);
      this.close();
    });

    const start = Date.now();

    do {
      try {
        const response = await fetch(`http://127.0.0.1:${this.#cdp_port}/json/version`, { signal: AbortSignal.timeout(350) });

        if (response.status !== 200) {
          continue;
        }

        const data = await response.json();

        if (!data.webSocketDebuggerUrl) {
          continue;
        }

        this.#cdp_websocket = new WebSocket(data.webSocketDebuggerUrl);

        await new Promise((res, rej) => {
          this.#cdp_websocket.on('error', err => {
            this.#logger.error('Error with CDP websocket', err?.stack || err);
            rej(err);
          })

          this.#cdp_websocket.on('open', () => {
            this.#browser_process_cdp_connected_at = new Date().toISOString();
            this.#logger.log('CDP websocket connected');
            this.#cdp_websocket.on('close', (code, reason) => {
              this.#browser_process_cdp_terminated_at = new Date().toISOString();
              this.#logger.log(`CDP Terminated ${code} ${reason.toString()}`);
              this.emit('cdp_terminated');
            });

            this.#cdp_channel = this.#tunnel.createChannel(BrowserInstance.CDP_CHANNEL_ID, data => {
              this.#cdp_websocket.send(data.toString('utf8'), { binary: false });
            });

            this.#cdp_websocket.on('message', (data) => {
              this.#cdp_channel.send(data.toString('utf8'));
            });

            res(undefined);
          })
        });

        return;
      } catch (e) {
        await new Promise(r => setTimeout(r, 20));
      }
    } while (Date.now() - start < 8000); // 8 seconds

    this.#logger.error('CDP websocket failed to connect. Closing.');
  }

  get status() {
    return {
      id: this.id,
      vnc_enabled: this.vnc_enabled,
      browser_pool: this.#browser_pool_service.status,
      connected_at: this.#connected_at,
      preparation_tasks_started_at: this.#preparation_tasks_started_at,
      browser_process_launching_at: this.#browser_process_launching_at,
      browser_process_launched_at: this.#browser_process_launched_at,
      browser_process_cdp_connected_at: this.#browser_process_cdp_connected_at,
      browser_process_cdp_terminated_at: this.#browser_process_cdp_terminated_at,
      completion_tasks_started_at: this.#completion_tasks_started_at,
      cdp_close_event_at: this.#cdp_close_event_at,
    } satisfies BrowserInstanceStatus;
  }

  #sendBrowserInstanceStatus() {
    if (this.#event_channel) {
      this.#event_channel.send(JSON.stringify({ type: 'BROWSER_INSTANCE_STATUS', status: this.status } satisfies BrowserInstanceStatusEvent));
    }
  }

  #isBrowserProcessAlive() {
    if (!this.#browser_instance_process) {
      return false;
    }

    try {
      process.kill(this.#browser_instance_process.pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

}
