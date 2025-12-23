// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DataSource, ILike, Repository } from 'typeorm';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';
// import { hashPassword } from '../../common/utils/crypto.util';

// import { User } from '../users/entities/user.entity';
// import { TeacherProfile } from './entities/teacher-profile.entity';

// import { CreateTeacherDto } from './dto/create-teacher.dto';
// import { UpdateTeacherDto } from './dto/update-teacher.dto';
// import { TeacherListQueryDto } from './dto/teacher-list.query.dto';

// function normalizeSection(section?: string | null): string | null {
//   if (section === undefined || section === null) return null;
//   const s = String(section).trim().toUpperCase();
//   return s.length ? s : null;
// }

// function parseDobOrNull(dob?: string): Date | null {
//   if (!dob) return null;
//   const v = String(dob).trim();
//   // Expect YYYY-MM-DD
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
//     throw new BadRequestException('dob must be in YYYY-MM-DD format');
//   }
//   const dt = new Date(`${v}T00:00:00.000Z`);
//   if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid dob date');
//   return dt;
// }

// function subjectsToStorage(subjects?: string[]): string | null {
//   if (!subjects || subjects.length === 0) return null;
//   const cleaned = subjects
//     .map((s) => String(s).trim())
//     .filter((s) => s.length > 0)
//     .slice(0, 20);
//   if (!cleaned.length) return null;
//   // Store as JSON string for stable parsing later.
//   return JSON.stringify(cleaned);
// }

// function subjectsFromStorage(raw: string | null): string[] {
//   if (!raw) return [];
//   try {
//     const arr = JSON.parse(raw);
//     if (Array.isArray(arr)) return arr.map((x) => String(x));
//     return [];
//   } catch {
//     // fallback: comma-separated legacy
//     return raw
//       .split(',')
//       .map((s) => s.trim())
//       .filter(Boolean);
//   }
// }

// @Injectable()
// export class TeachersService {
//   constructor(
//     private readonly dataSource: DataSource,
//     @InjectRepository(User) private readonly userRepo: Repository<User>,
//     @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
//   ) {}

//   private assertPrincipal(user: RequestUser) {
//     if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage teachers');
//   }

//   private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
//     if (!user.schoolId || !user.schoolCode) throw new ForbiddenException('School scope missing');
//     return { schoolId: user.schoolId, schoolCode: user.schoolCode };
//   }

//   async createTeacher(current: RequestUser, dto: CreateTeacherDto) {
//     this.assertPrincipal(current);
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     const email = dto.email.trim().toLowerCase();
//     const phone = dto.phone?.trim() || null;
//     const teacherId = dto.teacherId.trim();
//     const section = normalizeSection(dto.classTeacherSection);
//     const dob = parseDobOrNull(dto.dob);

//     if (section && !/^[A-Z]{1}$/.test(section)) {
//       throw new BadRequestException('classTeacherSection must be a single alphabet letter (A-Z)');
//     }

//     // If classTeacherSection is provided, classTeacherClass must exist
//     if (section && !dto.classTeacherClass) {
//       throw new BadRequestException('classTeacherClass is required when classTeacherSection is provided');
//     }

//     const passwordMinRounds = 12;
//     const passwordHash = await hashPassword(dto.temporaryPassword, passwordMinRounds);

//     const qr = this.dataSource.createQueryRunner();
//     await qr.connect();

//     try {
//       await qr.startTransaction();

//       // 1) Create user
//       const userEntity = qr.manager.getRepository(User).create({
//         schoolId,
//         schoolCode,
//         role: Role.TEACHER,
//         email,
//         phone,
//         passwordHash,
//         mustChangePassword: true,
//         biometricsEnabled: false,
//         isActive: true,
//         lastLoginAt: null,
//       });

//       let createdUser: User;
//       try {
//         createdUser = await qr.manager.getRepository(User).save(userEntity);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Teacher email already exists in this school');
//         }
//         throw e;
//       }

//       // 2) Create teacher profile
//       const profile = qr.manager.getRepository(TeacherProfile).create({
//         schoolId,
//         userId: createdUser.id,
//         teacherId,
//         fullName: dto.fullName.trim(),
//         gender: dto.gender,
//         dob,
//         profilePhotoUrl: dto.profilePhotoUrl?.trim() ?? null,
//         classTeacherClass: dto.classTeacherClass ?? null,
//         classTeacherSection: section,
//         subjectTeacher: subjectsToStorage(dto.subjects),
//       });

//       let createdProfile: TeacherProfile;
//       try {
//         createdProfile = await qr.manager.getRepository(TeacherProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Teacher ID already exists in this school');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();

//       return this.mapTeacherResponse(createdProfile, createdUser);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   async listTeachers(current: RequestUser, query: TeacherListQueryDto) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const qb = this.teacherRepo
//       .createQueryBuilder('t')
//       .leftJoinAndSelect('t.user', 'u')
//       .where('t.school_id = :schoolId', { schoolId });

//     if (query.search) {
//       const s = query.search.trim();
//       qb.andWhere(
//         '(t.full_name ILIKE :s OR t.teacher_id ILIKE :s OR u.email ILIKE :s)',
//         { s: `%${s}%` },
//       );
//     }

//     if (query.isClassTeacher === true) {
//       qb.andWhere('t.class_teacher_class IS NOT NULL');
//     }

//     if (query.classTeacherClass) {
//       qb.andWhere('t.class_teacher_class = :c', { c: query.classTeacherClass });
//     }

//     if (query.classTeacherSection) {
//       qb.andWhere('UPPER(COALESCE(t.class_teacher_section, \'\')) = :sec', {
//         sec: query.classTeacherSection.trim().toUpperCase(),
//       });
//     }

//     if (query.subject) {
//       const sub = query.subject.trim().toLowerCase();
//       // subjectTeacher stored as JSON string -> do a simple ILIKE match
//       qb.andWhere('LOWER(COALESCE(t.subject_teacher, \'\')) LIKE :sub', { sub: `%${sub}%` });
//     }

//     qb.orderBy('t.created_at', 'DESC').skip(query.skip).take(query.take);

//     const [rows, total] = await qb.getManyAndCount();

//     return {
//       items: rows.map((t) => this.mapTeacherResponse(t, t.user)),
//       total,
//       page: query.page ?? 1,
//       limit: query.take,
//     };
//   }

//   async getTeacherById(current: RequestUser, teacherProfileId: string) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.teacherRepo.findOne({
//       where: { id: teacherProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile) throw new NotFoundException('Teacher not found');

//     return this.mapTeacherResponse(profile, profile.user);
//   }

//   async updateTeacher(current: RequestUser, teacherProfileId: string, dto: UpdateTeacherDto) {
//     this.assertPrincipal(current);
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     // IMPORTANT: do not allow password reset here (use Auth reset flow)
//     if ((dto as any).temporaryPassword !== undefined) {
//       throw new BadRequestException('Use forgot/reset password flow to change password');
//     }

//     const profile = await this.teacherRepo.findOne({
//       where: { id: teacherProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Teacher not found');

//     const user = profile.user;

//     // Update user fields safely
//     if (dto.email !== undefined) {
//       user.email = dto.email.trim().toLowerCase();
//       user.schoolCode = schoolCode;
//       user.schoolId = schoolId;
//     }

//     if (dto.phone !== undefined) {
//       user.phone = dto.phone?.trim() || null;
//     }

//     // Update profile fields
//     if (dto.teacherId !== undefined) profile.teacherId = dto.teacherId.trim();
//     if (dto.fullName !== undefined) profile.fullName = dto.fullName.trim();
//     if (dto.gender !== undefined) profile.gender = dto.gender;
//     if (dto.profilePhotoUrl !== undefined) profile.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
//     if (dto.dob !== undefined) profile.dob = parseDobOrNull(dto.dob);

//     if (dto.classTeacherClass !== undefined) {
//       profile.classTeacherClass = dto.classTeacherClass ?? null;
//     }

//     if (dto.classTeacherSection !== undefined) {
//       const sec = normalizeSection(dto.classTeacherSection);
//       if (sec && !/^[A-Z]{1}$/.test(sec)) {
//         throw new BadRequestException('classTeacherSection must be a single alphabet letter (A-Z)');
//       }
//       profile.classTeacherSection = sec;
//     }

//     // If section exists but class missing
//     if (profile.classTeacherSection && !profile.classTeacherClass) {
//       throw new BadRequestException('classTeacherClass is required when classTeacherSection is provided');
//     }

//     if (dto.subjects !== undefined) {
//       profile.subjectTeacher = subjectsToStorage(dto.subjects);
//     }

//     const qr = this.dataSource.createQueryRunner();
//     await qr.connect();

//     try {
//       await qr.startTransaction();

//       try {
//         await qr.manager.getRepository(User).save(user);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Email already exists in this school');
//         }
//         throw e;
//       }

//       try {
//         await qr.manager.getRepository(TeacherProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Teacher ID already exists in this school');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();
//       return this.mapTeacherResponse(profile, user);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   async deleteTeacher(current: RequestUser, teacherProfileId: string): Promise<void> {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.teacherRepo.findOne({
//       where: { id: teacherProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Teacher not found');

//     // Safety: ensure it is really teacher role
//     if (profile.user.role !== Role.TEACHER) {
//       throw new BadRequestException('Only teacher accounts can be deleted here');
//     }

//     // Delete user -> cascades teacher_profile due to FK on teacher_profiles.user_id ON DELETE CASCADE
//     await this.userRepo.remove(profile.user);
//   }

//   private mapTeacherResponse(profile: TeacherProfile, user?: User) {
//     return {
//       id: profile.id,
//       schoolId: profile.schoolId,
//       userId: profile.userId,

//       teacherId: profile.teacherId,
//       fullName: profile.fullName,
//       gender: profile.gender,
//       dob: profile.dob ? profile.dob.toISOString().slice(0, 10) : null,

//       email: user?.email ?? null,
//       phone: user?.phone ?? null,

//       profilePhotoUrl: profile.profilePhotoUrl,

//       classTeacher: profile.classTeacherClass
//         ? {
//             classNumber: profile.classTeacherClass,
//             section: profile.classTeacherSection,
//           }
//         : null,

//       subjects: subjectsFromStorage(profile.subjectTeacher),

//       createdAt: profile.createdAt,
//       updatedAt: profile.updatedAt,
//     };
//   }
// }










import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { hashPassword } from '../../common/utils/crypto.util';

import { User } from '../users/entities/user.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';

import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherListQueryDto } from './dto/teacher-list.query.dto';

function normalizeSection(section?: string | null): string | null {
  if (section === undefined || section === null) return null;
  const s = String(section).trim().toUpperCase();
  return s.length ? s : null;
}

function parseDobOrNull(dob?: string): Date | null {
  if (!dob) return null;
  const v = String(dob).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new BadRequestException('dob must be in YYYY-MM-DD format');
  }
  const dt = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid dob date');
  return dt;
}

function subjectsToStorage(subjects?: string[]): string | null {
  if (!subjects || subjects.length === 0) return null;
  const cleaned = subjects
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
  if (!cleaned.length) return null;
  return JSON.stringify(cleaned);
}

function subjectsFromStorage(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map((x) => String(x));
    return [];
  } catch {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function formatDob(dob: unknown): string | null {
  if (!dob) return null;

  // If TypeORM gives string "YYYY-MM-DD"
  if (typeof dob === 'string') {
    const s = dob.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // If it's a Date
  if (dob instanceof Date) {
    return Number.isNaN(dob.getTime()) ? null : dob.toISOString().slice(0, 10);
  }

  // If it's some other object/number (fallback)
  try {
    const d = new Date(dob as any);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

@Injectable()
export class TeachersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
  ) {}

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage teachers');
  }

  private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
    if (!user.schoolId || !user.schoolCode) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId, schoolCode: user.schoolCode };
  }

  async createTeacher(current: RequestUser, dto: CreateTeacherDto) {
    this.assertPrincipal(current);
    const { schoolId, schoolCode } = this.assertSchoolScope(current);

    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;
    const teacherId = dto.teacherId.trim();
    const section = normalizeSection(dto.classTeacherSection);
    const dob = parseDobOrNull(dto.dob);

    if (section && !/^[A-Z]{1}$/.test(section)) {
      throw new BadRequestException('classTeacherSection must be a single alphabet letter (A-Z)');
    }
    if (section && !dto.classTeacherClass) {
      throw new BadRequestException('classTeacherClass is required when classTeacherSection is provided');
    }

    const passwordMinRounds = 12;
    const passwordHash = await hashPassword(dto.temporaryPassword, passwordMinRounds);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      const userEntity = qr.manager.getRepository(User).create({
        schoolId,
        schoolCode,
        role: Role.TEACHER,
        email,
        phone,
        passwordHash,
        mustChangePassword: true,
        biometricsEnabled: false,
        isActive: true,
        lastLoginAt: null,
      });

      let createdUser: User;
      try {
        createdUser = await qr.manager.getRepository(User).save(userEntity);
      } catch (e: any) {
        if (String(e?.code) === '23505') {
          throw new ConflictException('Teacher email already exists in this school');
        }
        throw e;
      }

      const profile = qr.manager.getRepository(TeacherProfile).create({
        schoolId,
        userId: createdUser.id,
        teacherId,
        fullName: dto.fullName.trim(),
        gender: dto.gender,
        dob,
        profilePhotoUrl: dto.profilePhotoUrl?.trim() ?? null,
        classTeacherClass: dto.classTeacherClass ?? null,
        classTeacherSection: section,
        subjectTeacher: subjectsToStorage(dto.subjects),
      });

      let createdProfile: TeacherProfile;
      try {
        createdProfile = await qr.manager.getRepository(TeacherProfile).save(profile);
      } catch (e: any) {
        if (String(e?.code) === '23505') {
          throw new ConflictException('Teacher ID already exists in this school');
        }
        throw e;
      }

      await qr.commitTransaction();
      return this.mapTeacherResponse(createdProfile, createdUser);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async listTeachers(current: RequestUser, query: TeacherListQueryDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.teacherRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .where('t.school_id = :schoolId', { schoolId });

    if (query.search) {
      const s = query.search.trim();
      qb.andWhere('(t.full_name ILIKE :s OR t.teacher_id ILIKE :s OR u.email ILIKE :s)', {
        s: `%${s}%`,
      });
    }

    if (query.isClassTeacher === true) qb.andWhere('t.class_teacher_class IS NOT NULL');
    if (query.classTeacherClass) qb.andWhere('t.class_teacher_class = :c', { c: query.classTeacherClass });

    if (query.classTeacherSection) {
      qb.andWhere('UPPER(COALESCE(t.class_teacher_section, \'\')) = :sec', {
        sec: query.classTeacherSection.trim().toUpperCase(),
      });
    }

    if (query.subject) {
      const sub = query.subject.trim().toLowerCase();
      qb.andWhere('LOWER(COALESCE(t.subject_teacher, \'\')) LIKE :sub', { sub: `%${sub}%` });
    }

    qb.orderBy('t.createdAt', 'DESC');
    qb.skip(query.skip ?? 0);
    qb.take(query.take ?? 20);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((t) => this.mapTeacherResponse(t, t.user)),
      total,
      page: query.page ?? 1,
      limit: query.take ?? 20,
    };
  }

  async getTeacherById(current: RequestUser, teacherProfileId: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.teacherRepo.findOne({
      where: { id: teacherProfileId, schoolId },
      relations: ['user'],
    });

    if (!profile) throw new NotFoundException('Teacher not found');

    return this.mapTeacherResponse(profile, profile.user);
  }

  async updateTeacher(current: RequestUser, teacherProfileId: string, dto: UpdateTeacherDto) {
    this.assertPrincipal(current);
    const { schoolId, schoolCode } = this.assertSchoolScope(current);

    if ((dto as any).temporaryPassword !== undefined) {
      throw new BadRequestException('Use forgot/reset password flow to change password');
    }

    const profile = await this.teacherRepo.findOne({
      where: { id: teacherProfileId, schoolId },
      relations: ['user'],
    });

    if (!profile || !profile.user) throw new NotFoundException('Teacher not found');

    const user = profile.user;

    if (dto.email !== undefined) {
      user.email = dto.email.trim().toLowerCase();
      user.schoolCode = schoolCode;
      user.schoolId = schoolId;
    }

    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;

    if (dto.teacherId !== undefined) profile.teacherId = dto.teacherId.trim();
    if (dto.fullName !== undefined) profile.fullName = dto.fullName.trim();
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.profilePhotoUrl !== undefined) profile.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
    if (dto.dob !== undefined) profile.dob = parseDobOrNull(dto.dob);

    if (dto.classTeacherClass !== undefined) profile.classTeacherClass = dto.classTeacherClass ?? null;

    if (dto.classTeacherSection !== undefined) {
      const sec = normalizeSection(dto.classTeacherSection);
      if (sec && !/^[A-Z]{1}$/.test(sec)) {
        throw new BadRequestException('classTeacherSection must be a single alphabet letter (A-Z)');
      }
      profile.classTeacherSection = sec;
    }

    if (profile.classTeacherSection && !profile.classTeacherClass) {
      throw new BadRequestException('classTeacherClass is required when classTeacherSection is provided');
    }

    if (dto.subjects !== undefined) profile.subjectTeacher = subjectsToStorage(dto.subjects);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      try {
        await qr.manager.getRepository(User).save(user);
      } catch (e: any) {
        if (String(e?.code) === '23505') {
          throw new ConflictException('Email already exists in this school');
        }
        throw e;
      }

      try {
        await qr.manager.getRepository(TeacherProfile).save(profile);
      } catch (e: any) {
        if (String(e?.code) === '23505') {
          throw new ConflictException('Teacher ID already exists in this school');
        }
        throw e;
      }

      await qr.commitTransaction();
      return this.mapTeacherResponse(profile, user);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async deleteTeacher(current: RequestUser, teacherProfileId: string): Promise<void> {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.teacherRepo.findOne({
      where: { id: teacherProfileId, schoolId },
      relations: ['user'],
    });

    if (!profile || !profile.user) throw new NotFoundException('Teacher not found');

    if (profile.user.role !== Role.TEACHER) {
      throw new BadRequestException('Only teacher accounts can be deleted here');
    }

    await this.userRepo.remove(profile.user);
  }

  private mapTeacherResponse(profile: TeacherProfile, user?: User) {
    return {
      id: profile.id,
      schoolId: profile.schoolId,
      userId: profile.userId,

      teacherId: profile.teacherId,
      fullName: profile.fullName,
      gender: profile.gender,
      dob: formatDob((profile as any).dob),

      email: user?.email ?? null,
      phone: user?.phone ?? null,

      profilePhotoUrl: profile.profilePhotoUrl,

      classTeacher: profile.classTeacherClass
        ? {
            classNumber: profile.classTeacherClass,
            section: profile.classTeacherSection,
          }
        : null,

      subjects: subjectsFromStorage(profile.subjectTeacher),

      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
