import { Controller, Get } from '@nestjs/common';
import { AuthenticationRequired } from 'src/decorators/authentication.decorator';
import { BrowserPoolService } from 'src/services/browser-pool.service';

@AuthenticationRequired()
@Controller('/browser-pool')
export class BrowserPoolController {

  constructor(private readonly browser_pool_service: BrowserPoolService) { }

  @Get()
  getBrowserPool() {
    return this.browser_pool_service.status;
  }

}
