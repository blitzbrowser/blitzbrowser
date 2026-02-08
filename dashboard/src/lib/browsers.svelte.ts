import { api_url, blitzbrowser_api_key, websocket_url } from "./api";

export interface BrowserPool {
    id: string;
    started_at: string;
    max_browser_instances: number;
    tags: { [key: string]: string; };
};

export interface BrowserInstances {
    id: string;

    vnc_enabled: boolean;

    browser_pool: BrowserPool;

    connected_at: string | undefined;
    preparation_tasks_started_at: string | undefined;
    browser_process_launching_at: string | undefined;
    browser_process_launched_at: string | undefined;
    browser_process_cdp_connected_at: string | undefined;
    browser_process_cdp_terminated_at: string | undefined;
    completion_tasks_started_at: string | undefined;

    cdp_close_event_at: string | undefined;
};

export class BrowserStore {

    browser_pool: BrowserPool | undefined = $state(undefined);

    browsers: Map<string, BrowserInstances> = $state(new Map());

    #websocket: WebSocket | undefined;

    /**
     * Connect the client to the backend. Update the browser pool status and connect to the browser instances status feed.
     */
    async connect() {
        await this.#updateBrowserPool();
        this.#connectBrowserInstances();
    }

    #connectBrowserInstances() {
        this.#websocket = new WebSocket(`${websocket_url}browser-instances?apiKey=${blitzbrowser_api_key}`);

        this.#websocket.onmessage = (event) => {
            const browser_instances = JSON.parse(event.data) as BrowserInstances[];

            this.browsers = browser_instances.reduce((map, browser) => {
                map.set(browser.id, browser);
                return map;
            }, new Map());
        };

        this.#websocket.onclose = () => {
            setTimeout(() => {
                this.#connectBrowserInstances();
            }, 250);
        };
    }

    async #updateBrowserPool() {
        while (true) {
            try {
                const response = await fetch(`${api_url}browser-pool`, {
                    headers: {
                        'x-api-key': blitzbrowser_api_key
                    }
                });

                browser_store.browser_pool = await response.json();

                return;
            } catch (e) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 100);
                })
            }
        }
    }

}

export const browser_store = new BrowserStore();