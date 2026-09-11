import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../../database/prisma/prisma.service';

@Catch()
@Injectable()
export class SystemErrorFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<
      Request & { user?: { tenantId?: string | null } }
    >();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    if (status >= 500) {
      void this.prisma.systemError
        .create({
          data: {
            tenantId: request.user?.tenantId ?? null,
            method: request.method,
            path: request.originalUrl,
            statusCode: status,
            message: message.slice(0, 1000),
            stack:
              exception instanceof Error
                ? exception.stack?.slice(0, 10000)
                : null,
          },
        })
        .catch(() => undefined);
    }
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };
    response
      .status(status)
      .json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
  }
}
