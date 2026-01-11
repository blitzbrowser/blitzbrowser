import { Controller, Get } from '@nestjs/common';
import { BrowserPoolService } from 'src/services/browser-pool.service';

@Controller('/status')
export class StatusController {

  constructor(private readonly browser_pool_service: BrowserPoolService) { }

  @Get()
  getStatus() {
    return {
      sigterm_received: this.browser_pool_service.sigterm_received,
      browsers_running: this.browser_pool_service.nb_browser_instances_alive,
      max_browsers: this.browser_pool_service.max_browser_instances,
    };
  }

}
