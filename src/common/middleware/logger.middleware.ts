import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const requestId = (req as any).requestId ?? req.headers['x-request-id'];

      // Minimal clean logs (you can replace with Winston later)
      // Example:
      // [200] GET /health - 6ms reqId=...
      // eslint-disable-next-line no-console
      console.log(
        `[${res.statusCode}] ${req.method} ${req.originalUrl} - ${ms}ms${requestId ? ` reqId=${requestId}` : ''}`,
      );
    });

    next();
  }
}
