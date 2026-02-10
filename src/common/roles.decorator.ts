import { SetMetadata } from '@nestjs/common';
import type { Role } from './identity.middleware.js';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to the listed roles. Needs RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
