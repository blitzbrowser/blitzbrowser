import { Controller, Get } from '@nestjs/common';
import { BrowserPoolService } from 'src/services/browser-pool.service';

@Controller('/browser-pool')
export class BrowserPoolController {

  constructor(private readonly browser_pool_service: BrowserPoolService) { }

  @Get()
  getStatus() {
    return this.browser_pool_service.status;
  }

}
