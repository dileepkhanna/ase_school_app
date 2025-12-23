// import { Controller, Get } from '@nestjs/common';
// import { AppService } from './app.service';

// @Controller()
// export class AppController {
//   constructor(private readonly appService: AppService) {}

//   /**
//    * Simple root endpoint (public)
//    */
//   @Get()
//   root() {
//     return this.appService.root();
//   }

//   /**
//    * Health endpoint (public)
//    */
//   @Get('health')
//   health() {
//     return this.appService.health();
//   }
// }







import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Simple root endpoint (public)
   */
  @Get()
  root() {
    return this.appService.root();
  }

  /**
   * Health endpoint (public)
   */
  @Get('health')
  health() {
    return this.appService.health();
  }

  /**
   * Browser favicon request handler (public)
   * Returns 204 No Content to avoid noisy NotFound logs.
   */
  @Get('favicon.ico')
  favicon(@Res() res: Response) {
    return res.status(204).send();
  }
}
