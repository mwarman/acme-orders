export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RULE_VIOLATION'
  | 'FORBIDDEN'
  | 'GATEWAY_TIMEOUT';

/** Business-rule failure raised by services. Mapped to an HTTP status by HttpErrorFilter. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
