import { ChildProcess, spawn } from 'child_process';
import * as fsPromise from 'fs/promises';
import { exit } from 'process';
import puppeteer, { Browser } from 'puppeteer';

let SIGTERM_RECEIVED = false;

class BrowserInstanceProcess {

    readonly #display_id = parseInt(process.env.DISPLAY_ID);
    readonly #cdp_port = parseInt(process.env.CDP_PORT);
    readonly #proxy_server_port = parseInt(process.env.PROXY_SERVER_PORT);
    readonly #timezone = process.env.TZ;
    readonly #user_data_folder = process.env.USER_DATA_FOLDER;

    #xvfb_process: ChildProcess;
    #x11vnc_process: ChildProcess;
    #fluxbox_process: ChildProcess;
    #puppeteer_process: Browser;

    #is_closing = false;
    #client_disconnected = false;

    get launched() {
        return this.#xvfb_process !== undefined && this.#puppeteer_process !== undefined;
    }

    async launch() {
        if (SIGTERM_RECEIVED) {
            console.log(`Can't launch, received sigterm before launching.`);
            await this.close();
            return;
        }

        console.log('Launching');

        try {
            const display_id = this.#display_id;
            const display = `:${display_id}`;

            // When container is restarting, xvfb locks are not always released on file system.
            await fsPromise.rm(`/tmp/.X${display_id}-lock`, { force: true });

            console.log('Creating xvfb process');
            this.#xvfb_process = spawn('Xvfb', [display, '-screen', '0', '1920x1080x16']);
            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
            this.#fluxbox_process = spawn('fluxbox', ['-display', display], { stdio: 'inherit' });;

            console.log('Creating puppeteer process');
            this.#puppeteer_process = await puppeteer.launch({
                headless: false,
                executablePath: puppeteer.executablePath(),
                userDataDir: this.#user_data_folder,
                dumpio: true,
                handleSIGTERM: false,
                args: [
                    `--remote-debugging-port=${this.#cdp_port}`,
                    '--remote-debugging-address=0.0.0.0',
                    '--no-first-run',
                    '--no-default-browser-check',
                    `--display=${display}`,
                    '--disable-breakpad', // Disables crash reporting
                    '--disable-component-update', // Disables updates to internal components
                    '--disable-print-preview', // Disables print preview
                    '--disable-domain-reliability', // Disables domain reliability service(client-side reliability monitoring system for Google sites)
                    '--disk-cache-dir=/dev/null', // Prevents disk caching
                    '--no-pings', // Disables hyperlink auditing pings
                    '--disable-notifications', // Prevents web push notifications
                    '--disable-features=TranslateUI', // Disables the translate UI
                    '--disable-background-networking',
                    '--disable-sync',
                    '--disable-extensions',
                    '--disable-signin-promo',
                    '--disable-gpu',
                    '--metrics-recording-only', // Record metrics, but doesn't report them
                    '--disable-features=PersistentHistograms', // Prevents generation of BrowserMetrics files on disk
                    `--start-maximized`,
                    `--proxy-server=http://127.0.0.1:${this.#proxy_server_port}`,
                    process.env.DISABLE_SHM === 'true' ? '--disable-dev-shm-usage' : undefined
                ].filter(s => typeof s === 'string'),
                env: {
                    TZ: this.#timezone
                },
            });

            this.#x11vnc_process = spawn('x11vnc', ['-display', display, '-nopw', '-listen', '0.0.0.0', '-forever', '-shared', '-noxdamage', '-ncache', '-verbose'], { stdio: 'inherit' });

            console.log('Created puppeteer process.');

            this.#puppeteer_process.on('disconnected', () => {
                this.#client_disconnected = true;
                console.log('Client disconnected');
            });

            const interval_id = setInterval(() => {
                if (this.#puppeteer_process.connected) {
                    return;
                }

                clearInterval(interval_id);

                if (this.#is_closing) {
                    return;
                }

                console.log(`Puppeteer not connected.`);

                this.close();
            }, 200);
        } catch (e) {
            console.log('Error while launching processes', e);
            this.close();
        } finally {
            if (SIGTERM_RECEIVED) {
                this.close();
                return;
            }
        }
    }

    async close() {
        if (this.#is_closing) {
            return;
        }

        this.#is_closing = true;

        console.log('Closing.');

        // We need to close puppeteer first. All other processes HAVE to be closed after. Otherwise it crashes puppeteer.
        if (this.#puppeteer_process) {
            try {
                // If the client disconnected, it means puppeteer is already closing the browser process.
                // Calling close() if already closing corrupt the user data. I lost 5 days over this concurrent closing issue.
                if (!this.#client_disconnected && this.#puppeteer_process.connected) {
                    await this.#puppeteer_process.close();
                }

                await this.#waitGoogleChromeKilled();
            } catch (e) {
                console.error('Error while killing puppeteer', e?.stack);
            }
        }

        if (this.#x11vnc_process) {
            try {
                this.#x11vnc_process.kill();
            } catch (e) {
                console.error('Error while killing x11vnc process', e?.stack);
            }
        }

        if (this.#fluxbox_process) {
            try {
                this.#fluxbox_process.kill();
            } catch (e) {
                console.error('Error while killing fluxbox process', e?.stack);
            }
        }

        if (this.#xvfb_process) {
            try {
                this.#xvfb_process.kill();
            } catch (e) {
                console.error('Error while killing xvfb process', e?.stack);
            }
        }

        exit(0);
    }

    async #waitGoogleChromeKilled() {
        let count = 0;

        await new Promise((res) => {
            const interval_id = setInterval(() => {
                if (count === 60) { // 3 seconds
                    clearInterval(interval_id);
                    res(undefined);
                    return;
                }

                const ps = spawn('ps', ['ax']);

                ps.on('exit', () => {
                    count++;
                });

                ps.stdout.on('data', (data: Buffer) => {
                    const message = data.toString();
                    if (!message.includes(this.#user_data_folder)) {
                        clearInterval(interval_id);
                        res(undefined);
                    }
                })
            }, 50);
        });
    }
}

let browser_instance_process: BrowserInstanceProcess;

process.on('SIGTERM', () => {
    SIGTERM_RECEIVED = true;
    console.log('Received SIGTERM');

    // If we receive sigterm while launching processes, we are going to wait for processes to finish launching.
    // It guarantees that google chrome fully launched before killing it.
    if (browser_instance_process && browser_instance_process.launched) {
        browser_instance_process.close();
    }
});

browser_instance_process = new BrowserInstanceProcess();

browser_instance_process.launch();