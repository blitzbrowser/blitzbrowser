import { Controller, Get } from '@nestjs/common';
import { BrowserPoolService } from 'src/services/browser-pool.service';

@Controller('/status')
export class PoolStatusController {

  constructor(private readonly pool_service: BrowserPoolService) { }

  @Get()
  getStatus() {
    return {
      sigterm_received: this.pool_service.sigterm_received,
      browsers_running: this.pool_service.nb_browser_instances_alive,
      max_browsers: this.pool_service.max_browser_instances,
    };
  }

}
