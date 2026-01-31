import { Injectable, Logger } from "@nestjs/common";
import { WebSocket } from "ws";
import * as net from 'net';
import { BrowserInstance } from "src/components/browser-instance.component";

@Injectable()
export class VNCWebSocketGateway {

    readonly #logger = new Logger(VNCWebSocketGateway.name);

    constructor() { }

    connectVNC(websocket_client: WebSocket, browser_instance: BrowserInstance) {
        const tcp_client = new net.Socket();

        tcp_client.connect(browser_instance.vnc_port, 'localhost', () => {
            this.#logger.log(`Connected websocket to browser instance ${browser_instance.id}`);
        });

        websocket_client.on('message', (data) => {
            if (tcp_client.writable && Buffer.isBuffer(data)) {
                tcp_client.write(data);
            }
        });

        tcp_client.on('data', (data) => {
            if (websocket_client.readyState === WebSocket.OPEN) {
                websocket_client.send(data);
            }
        });

        const close = () => {
            this.#logger.log(`Closing websocket to browser instance ${browser_instance.id}`);
            tcp_client.destroy();
            websocket_client.close();
        };

        tcp_client.on('close', close);
        tcp_client.on('error', (err) => this.#logger.error('TCP Error:', err.message));

        websocket_client.on('close', close);
        websocket_client.on('error', (err) => this.#logger.error('WS Error:', err.message));
    }

}