import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PluginExecutionError, TemplateRenderError } from '@nestjs-initializr/generator';
import type { ApiErrorResponse } from '@nestjs-initializr/generator';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the full error server-side
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    let body: ApiErrorResponse;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)['message'] ?? exception.message
          : exception.message;

      body = {
        statusCode: status,
        message: message as string | string[],
        error: exception.name,
      };
    } else if (exception instanceof PluginExecutionError) {
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '插件执行失败',
        error: 'Internal Server Error',
        pluginName: (exception as PluginExecutionError).pluginName,
      };
    } else if (exception instanceof TemplateRenderError) {
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `模板渲染失败: ${(exception as TemplateRenderError).name}`,
        error: 'Internal Server Error',
      };
    } else {
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '服务器内部错误',
        error: 'Internal Server Error',
      };
    }

    response.status(body.statusCode).json(body);
  }
}
