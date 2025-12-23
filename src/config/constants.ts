/**
 * Central place for constants used across the backend.
 * Keep this file dependency-free (no imports from modules).
 */

export const APP_REQUEST_ID_HEADER = 'x-request-id';

export const PASSWORD_MIN_LENGTH = 8;

// App roles for authorization (actual enum is in common/enums, but constants can be used here)
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Geo defaults (teacher geo login)
export const DEFAULT_GEOFENCE_RADIUS_M = 200;

// OTP defaults (can be overridden by env)
export const DEFAULT_OTP_LENGTH = 6;
export const DEFAULT_OTP_TTL_SECONDS = 300;
export const DEFAULT_OTP_MAX_ATTEMPTS = 5;
export const DEFAULT_OTP_COOLDOWN_SECONDS = 60;

// Timeouts
export const DEFAULT_HTTP_TIMEOUT_MS = 20000;
