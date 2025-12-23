// export enum AttendanceMark {
//   PRESENT = 'P',
//   ABSENT = 'A',
//   HALF_DAY = 'H',
// }

// /**
//  * Backward-compatible alias used across entities/services/jobs.
//  * So imports like `import { AttendanceStatus } from ...` will work.
//  */
// export const AttendanceStatus = AttendanceMark;
// export type AttendanceStatus = AttendanceMark;

// export enum AttendanceSession {
//   MORNING = 'MORNING',
//   AFTERNOON = 'AFTERNOON',
// }





export enum AttendanceMark {
  PRESENT = 'P',
  ABSENT = 'A',
  HALF_DAY = 'H',
}

/**
 * Compatibility alias:
 * Allows code like AttendanceStatus.P / AttendanceStatus.A / AttendanceStatus.H
 */
export const AttendanceStatus = {
  P: AttendanceMark.PRESENT,
  A: AttendanceMark.ABSENT,
  H: AttendanceMark.HALF_DAY,

  PRESENT: AttendanceMark.PRESENT,
  ABSENT: AttendanceMark.ABSENT,
  HALF_DAY: AttendanceMark.HALF_DAY,
} as const;

export type AttendanceStatus = AttendanceMark;

export enum AttendanceSession {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}
