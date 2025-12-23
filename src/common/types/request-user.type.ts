import { Role } from '../enums/role.enum';

/**
 * This is the user object we attach to request after JWT auth.
 * Keep it minimal and stable.
 */
export type RequestUser = {
  userId: string;
  role: Role;

  /**
   * School scoping for multi-tenant security.
   * ASE_ADMIN may have null school.
   */
  schoolId: string | null;
  schoolCode: string | null;

  email: string;
  deviceId?: string | null;

  /**
   * Useful flags for onboarding
   */
  mustChangePassword?: boolean;
  biometricsEnabled?: boolean;

  /**
   * Permissions-like helpers (optional; can evolve later)
   */
  isActive?: boolean;
};
