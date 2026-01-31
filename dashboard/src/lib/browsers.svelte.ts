export interface BrowserPool {
    id: string;
    started_at: string;
    max_browser_instances: number;
    tags: { [key: string]: string; };
};

export interface Browser {
    id: string;

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

    browsers: Map<string, Browser> = $state(new Map());

    update(browsers: Browser[]) {
        this.browsers = browsers.reduce((map, browser) => {
            map.set(browser.id, browser);
            return map;
        }, new Map());
    }

}

export const browser_store = new BrowserStore();