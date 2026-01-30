export interface Browser {
    id: string;

    browser_pool: {
        id: string;
        started_at: string;
        max_browser_instances: number;
        tags: { [key: string]: string; };
    };

    connected_at: string | undefined;
    preparation_tasks_started_at: string | undefined;
    browser_process_launching_at: string | undefined;
    browser_process_launched_at: string | undefined;
    browser_process_cdp_connected_at: string | undefined;
    browser_process_cdp_terminated_at: string | undefined;
    completion_tasks_started_at: string | undefined;

    cdp_close_event_at: string | undefined;
}

export class BrowserStore {

    browsers: Browser[] = $state([]);

}

export const browser_store = new BrowserStore();