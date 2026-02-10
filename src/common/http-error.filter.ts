import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, type DomainErrorCode } from './domain-error.js';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  RULE_VIOLATION: 422,
  FORBIDDEN: 403,
  GATEWAY_TIMEOUT: 504,
};

@Catch(DomainError)
export class HttpErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = STATUS_BY_CODE[error.code];
    response.status(statusCode).json({ statusCode, error: error.code, message: error.message });
  }
}
