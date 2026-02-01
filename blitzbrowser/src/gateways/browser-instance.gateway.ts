import { Injectable, OnModuleInit } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { BrowserPoolService } from "src/services/browser-pool.service";
import { WebSocket } from "ws";

@Injectable()
export class BrowserInstanceWebSocketGateway implements OnModuleInit {

    readonly #websockets: Map<string, WebSocket> = new Map();

    constructor(
        readonly browser_pool_service: BrowserPoolService
    ) { }

    onModuleInit() {
        this.browser_pool_service.on('browser_instance_created', browser_instance => {
            browser_instance.on('cdp_terminated', () => {
                this.#sendBrowserInstancesStatus();
            });

            browser_instance.on('terminated', () => {
                this.#sendBrowserInstancesStatus();
            });

            this.#sendBrowserInstancesStatus();
        });
    }

    @Interval(1000)
    updateBrowserInstancesStatus() {
        this.#sendBrowserInstancesStatus();
    }

    connectBrowserInstancesEvents(websocket_client: WebSocket) {
        const id = crypto.randomUUID();

        this.#websockets.set(id, websocket_client);

        websocket_client.on('close', () => {
            this.#websockets.delete(id);
        });

        this.#sendBrowserInstancesStatus();
    }

    #sendBrowserInstancesStatus() {
        const json = JSON.stringify(this.browser_pool_service.browser_instances.map(bi => bi.status));

        this.#websockets.forEach((websocket) => {
            websocket.send(json);
        });
    }

}