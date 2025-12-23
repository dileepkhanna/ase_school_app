// import {
//   ArgumentsHost,
//   Catch,
//   ExceptionFilter,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch()
// export class AllExceptionsFilter implements ExceptionFilter {
//   catch(exception: unknown, host: ArgumentsHost) {
//     const ctx = host.switchToHttp();
//     const res = ctx.getResponse<Response>();
//     const req = ctx.getRequest<Request>();

//     const requestId = (req.headers['x-request-id'] as string | undefined) ?? undefined;

//     let status = HttpStatus.INTERNAL_SERVER_ERROR;
//     let message: string | string[] = 'Internal server error';

//     if (exception instanceof HttpException) {
//       status = exception.getStatus();
//       const resp = exception.getResponse() as any;
//       message = resp?.message ?? exception.message ?? message;
//     } else if (exception instanceof Error) {
//       message = exception.message || message;
//     }

//     res.status(status).json({
//       success: false,
//       error: {
//         statusCode: status,
//         message,
//         path: req.url,
//         method: req.method,
//         requestId,
//         timestamp: new Date().toISOString(),
//       },
//     });
//   }
// }









import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? undefined;

    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const isProd = nodeEnv === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    const err = exception as any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse() as any;
      message = resp?.message ?? resp ?? exception.message ?? message;
    } else if (err?.message) {
      message = err.message;
    }

    // ✅ IMPORTANT: log the full stack in terminal (so we can fix exact file/line)
    // eslint-disable-next-line no-console
    console.error(
      `❌ ${req.method} ${req.originalUrl} reqId=${requestId ?? '-'}`,
      err?.stack ?? err,
    );

    res.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message,
        path: req.originalUrl, // better than req.url
        method: req.method,
        requestId,
        timestamp: new Date().toISOString(),

        // ✅ in dev, include stack in response too
        ...(isProd
          ? {}
          : {
              stack: String(err?.stack ?? '')
                .split('\n')
                .slice(0, 30)
                .join('\n'),
            }),
      },
    });
  }
}
