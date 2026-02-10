import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthedRequest, Role } from './identity.middleware.js';
import { ROLES_KEY } from './roles.decorator.js';

/** Requires an identity. If @Roles is present, the caller's role must be listed. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) {
      throw new UnauthorizedException('Missing or invalid identity headers');
    }
    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed && !allowed.includes(req.user.role)) {
      throw new ForbiddenException(`Role '${req.user.role}' may not call this route`);
    }
    return true;
  }
}
