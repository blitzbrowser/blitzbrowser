import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class TimezoneService {

    private readonly logger = new Logger(TimezoneService.name);

    #default_timezone: Promise<string>;

    getDefaultTimezone() {
        if (!this.#default_timezone) {
            this.#default_timezone = new Promise(async (res) => {
                res((await (await fetch('http://ip-api.com/json?fields=timezone')).json()).timezone);
            });
        }

        return this.#default_timezone;
    }

    async getProxyTimezone(proxy_url: string): Promise<string> {
        try {
            const url = new URL(proxy_url);
            const response = await axios.get('http://ip-api.com/json?fields=timezone', {
                proxy: {
                    protocol: url.protocol,
                    host: url.hostname,
                    port: parseInt(url.port),
                    auth: {
                        username: url.username,
                        password: url.password,
                    }
                }
            });

            return response.data.timezone;
        } catch (e) {
            this.logger.error(`Error while getting timezone.`, e);
        }
    }

}