import { Injectable, type NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const ROLE_NAMES = ['customer', 'support', 'admin'] as const;
export type Role = (typeof ROLE_NAMES)[number];

export interface User {
  id: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user?: User;
}

/**
 * Identity stub for the course: no tokens or credentials.
 * Reads X-User-Id and X-User-Role. Authorization decisions stay real.
 */
@Injectable()
export class IdentityMiddleware implements NestMiddleware {
  use(req: AuthedRequest, _res: Response, next: NextFunction): void {
    const id = req.header('x-user-id');
    const role = req.header('x-user-role');
    if (id && role && (ROLE_NAMES as readonly string[]).includes(role)) {
      req.user = { id, role: role as Role };
    }
    next();
  }
}

export function requireUser(req: AuthedRequest): User {
  if (!req.user) {
    throw new UnauthorizedException('Missing or invalid identity headers');
  }
  return req.user;
}
