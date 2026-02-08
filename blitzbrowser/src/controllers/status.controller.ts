import { Controller, Get } from '@nestjs/common';
import { NoAuthenticationRequired } from 'src/decorators/authentication.decorator';

@Controller('/status')
@NoAuthenticationRequired()
export class StatusController {

  constructor() { }

  @Get()
  getStatus() {
    return 'Ready to render the web.';
  }

}
