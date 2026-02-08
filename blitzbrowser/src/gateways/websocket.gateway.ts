import { ExpressAdapter } from '@nestjs/platform-express';
import { WebSocketServer } from "ws";
import { CDPWebSocketGateway } from "./cdp.gateway";
import { VNCWebSocketGateway } from "./vnc.gateway";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { BrowserPoolService } from 'src/services/browser-pool.service';
import { BrowserInstanceWebSocketGateway } from './browser-instance.gateway';
import { ApiKeyGuard } from 'src/guards/api-key.guard';

@Injectable()
export class WebSocketGateway implements OnModuleInit {

    private static readonly BROWSER_INSTANCES_PATH = /^\/browser-instances\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/;

    readonly #logger = new Logger(WebSocketGateway.name);

    constructor(
        readonly api_key_guard: ApiKeyGuard,
        readonly http_adapter_host: HttpAdapterHost,
        readonly cdp_ws_gateway: CDPWebSocketGateway,
        readonly vnc_ws_gateway: VNCWebSocketGateway,
        readonly browser_pool_service: BrowserPoolService,
        readonly browser_instance_ws_gateway: BrowserInstanceWebSocketGateway,
    ) { }

    onModuleInit() {
        const cdp_websocket_server = new WebSocketServer({ server: (this.http_adapter_host.httpAdapter as ExpressAdapter).getHttpServer() });

        cdp_websocket_server.on('connection', async (websocket_client, request) => {
            const url = new URL(`http://127.0.0.1${request.url}`);

            if (!this.api_key_guard.canActivateWebsocket(request, url)) {
                websocket_client.close(4000, 'Invalid API key.');
                return;
            }

            if (url.pathname === '/') {
                this.cdp_ws_gateway.connectCDP(websocket_client, url);
                return;
            }

            if (url.pathname === '/browser-instances') {
                this.browser_instance_ws_gateway.connectBrowserInstancesEvents(websocket_client);
                return;
            }

            const [_, browser_instance_id, endpoint] = WebSocketGateway.BROWSER_INSTANCES_PATH.exec(url.pathname);

            if (browser_instance_id === null) {
                websocket_client.close();
                return;
            }

            const browser_instance = this.browser_pool_service.getBrowserInstanceById(browser_instance_id);

            if (!browser_instance) {
                websocket_client.close();
                return;
            }

            switch (endpoint) {
                case 'vnc':
                    this.vnc_ws_gateway.connectVNC(websocket_client, browser_instance);
                    break;
                default:
                    websocket_client.close();
                    break;
            }
        });
    }

}