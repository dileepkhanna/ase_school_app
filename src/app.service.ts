import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  root() {
    return {
      name: 'ASE School Backend',
      status: 'ok',
    };
  }

  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
