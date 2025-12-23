import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { APP_REQUEST_ID_HEADER } from '../../config/constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(APP_REQUEST_ID_HEADER);
    const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

    (req as any).requestId = requestId;
    res.setHeader(APP_REQUEST_ID_HEADER, requestId);

    next();
  }
}
