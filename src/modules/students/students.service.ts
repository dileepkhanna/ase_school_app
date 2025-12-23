// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { ConfigService } from '@nestjs/config';
// import { DataSource, Repository } from 'typeorm';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';
// import { hashPassword } from '../../common/utils/crypto.util';

// import { User } from '../users/entities/user.entity';
// import { StudentProfile } from './entities/student-profile.entity';
// import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';

// import { CreateStudentDto } from './dto/create-student.dto';
// import { UpdateStudentDto } from './dto/update-student.dto';
// import { StudentListQueryDto } from './dto/student-list.query.dto';

// function normalizeSection(section?: string | null): string | null {
//   if (section === undefined || section === null) return null;
//   const s = String(section).trim().toUpperCase();
//   return s.length ? s : null;
// }

// function parseDobOrNull(dob?: string): Date | null {
//   if (!dob) return null;
//   const v = String(dob).trim();
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
//     throw new BadRequestException('dob must be in YYYY-MM-DD format');
//   }
//   const dt = new Date(`${v}T00:00:00.000Z`);
//   if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid dob date');
//   return dt;
// }

// @Injectable()
// export class StudentsService {
//   constructor(
//     private readonly dataSource: DataSource,
//     private readonly config: ConfigService,
//     @InjectRepository(User) private readonly userRepo: Repository<User>,
//     @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
//     @InjectRepository(TeacherProfile) private readonly teacherRepo: Repository<TeacherProfile>,
//   ) {}

//   private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
//     if (!user.schoolId || !user.schoolCode) throw new ForbiddenException('School scope missing');
//     return { schoolId: user.schoolId, schoolCode: user.schoolCode };
//   }

//   private assertPrincipal(user: RequestUser) {
//     if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can do this action');
//   }

//   private async getTeacherClassScopeOrFail(current: RequestUser): Promise<{
//     classNumber: number;
//     section: string | null;
//   }> {
//     const { schoolId } = this.assertSchoolScope(current);

//     const t = await this.teacherRepo.findOne({
//       where: { schoolId, userId: current.userId },
//     });

//     if (!t) throw new ForbiddenException('Teacher profile not found');

//     if (!t.classTeacherClass) {
//       throw new ForbiddenException('Only class teachers can access student list/details');
//     }

//     return {
//       classNumber: t.classTeacherClass,
//       section: normalizeSection(t.classTeacherSection),
//     };
//   }

//   // ---------------------------
//   // CREATE (Principal or Teacher)
//   // Teacher can ONLY create for their own class (if they are class teacher)
//   // ---------------------------
//   async createStudent(current: RequestUser, dto: CreateStudentDto) {
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     const email = dto.email.trim().toLowerCase();
//     const mobileNumber = dto.mobileNumber?.trim() || null;
//     const section = normalizeSection(dto.section ?? null);
//     const dob = parseDobOrNull(dto.dob);

//     if (section && !/^[A-Z]{1}$/.test(section)) {
//       throw new BadRequestException('section must be a single alphabet letter (A-Z)');
//     }

//     // Teacher restriction
//     if (current.role === Role.TEACHER) {
//       const scope = await this.getTeacherClassScopeOrFail(current);

//       if (dto.classNumber !== scope.classNumber) {
//         throw new ForbiddenException('You can add students only for your class');
//       }
//       if ((scope.section ?? null) !== (section ?? null)) {
//         throw new ForbiddenException('You can add students only for your class section');
//       }
//     }

//     const rounds = Number(this.config.get<number>('security.bcryptSaltRounds') ?? 12);
//     const passwordHash = await hashPassword(dto.temporaryPassword, rounds);

//     const qr = this.dataSource.createQueryRunner();
//     await qr.connect();

//     try {
//       await qr.startTransaction();

//       // 1) create user (role STUDENT)
//       const userEntity = qr.manager.getRepository(User).create({
//         schoolId,
//         schoolCode,
//         role: Role.STUDENT,
//         email,
//         phone: null,
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
//           throw new ConflictException('Student email already exists in this school');
//         }
//         throw e;
//       }

//       // 2) create student profile
//       const profile = qr.manager.getRepository(StudentProfile).create({
//         schoolId,
//         userId: createdUser.id,
//         fullName: dto.fullName.trim(),
//         gender: dto.gender,
//         rollNumber: dto.rollNumber,
//         dob,
//         profilePhotoUrl: dto.profilePhotoUrl?.trim() ?? null,
//         mobileNumber,
//         classNumber: dto.classNumber,
//         section,
//       });

//       let createdProfile: StudentProfile;
//       try {
//         createdProfile = await qr.manager.getRepository(StudentProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Duplicate roll number for this class/section');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();
//       return this.mapStudentResponse(createdProfile, createdUser);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   // ---------------------------
//   // LIST (Principal or Teacher)
//   // Teacher sees ONLY their class (class teacher only)
//   // ---------------------------
//   async listStudents(current: RequestUser, query: StudentListQueryDto) {
//     const { schoolId } = this.assertSchoolScope(current);

//     let enforcedClass: number | null = null;
//     let enforcedSection: string | null = null;

//     if (current.role === Role.TEACHER) {
//       const scope = await this.getTeacherClassScopeOrFail(current);
//       enforcedClass = scope.classNumber;
//       enforcedSection = scope.section ?? null;
//     }

//     const qb = this.studentRepo
//       .createQueryBuilder('s')
//       .leftJoinAndSelect('s.user', 'u')
//       .where('s.school_id = :schoolId', { schoolId });

//     // teacher enforced scope
//     if (enforcedClass !== null) qb.andWhere('s.class_number = :c', { c: enforcedClass });
//     if (enforcedClass !== null) {
//       if (enforcedSection === null) qb.andWhere('s.section IS NULL');
//       else qb.andWhere('s.section = :sec', { sec: enforcedSection });
//     }

//     // principal filters
//     if (current.role === Role.PRINCIPAL) {
//       if (query.classNumber) qb.andWhere('s.class_number = :c2', { c2: query.classNumber });

//       if (query.section !== undefined) {
//         const sec = normalizeSection(query.section);
//         if (sec) qb.andWhere('s.section = :sec2', { sec2: sec });
//         else qb.andWhere('s.section IS NULL');
//       }

//       if (query.rollNumber) qb.andWhere('s.roll_number = :r', { r: query.rollNumber });
//     }

//     if (query.search) {
//       const s = query.search.trim();
//       qb.andWhere('(s.full_name ILIKE :q OR u.email ILIKE :q)', { q: `%${s}%` });
//     }

//     qb.orderBy('s.class_number', 'ASC')
//       .addOrderBy('s.section', 'ASC')
//       .addOrderBy('s.roll_number', 'ASC')
//       .skip(query.skip)
//       .take(query.take);

//     const [rows, total] = await qb.getManyAndCount();

//     return {
//       items: rows.map((r) => this.mapStudentResponse(r, r.user)),
//       total,
//       page: query.page ?? 1,
//       limit: query.take,
//     };
//   }

//   // ---------------------------
//   // GET ONE (Principal or Teacher)
//   // Teacher sees ONLY their class
//   // ---------------------------
//   async getStudentById(current: RequestUser, studentProfileId: string) {
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Student not found');

//     if (current.role === Role.TEACHER) {
//       const scope = await this.getTeacherClassScopeOrFail(current);
//       const sec = normalizeSection(profile.section);
//       if (profile.classNumber !== scope.classNumber) throw new ForbiddenException('Access denied');
//       if ((scope.section ?? null) !== (sec ?? null)) throw new ForbiddenException('Access denied');
//     }

//     return this.mapStudentResponse(profile, profile.user);
//   }

//   // ---------------------------
//   // UPDATE / DELETE (Principal only)
//   // ---------------------------
//   async updateStudent(current: RequestUser, studentProfileId: string, dto: UpdateStudentDto) {
//     this.assertPrincipal(current);
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     if ((dto as any).temporaryPassword !== undefined) {
//       throw new BadRequestException('Use forgot/reset password flow to change password');
//     }

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Student not found');

//     const user = profile.user;

//     if (dto.email !== undefined) {
//       user.email = dto.email.trim().toLowerCase();
//       user.schoolCode = schoolCode;
//       user.schoolId = schoolId;
//     }

//     if (dto.fullName !== undefined) profile.fullName = dto.fullName.trim();
//     if (dto.gender !== undefined) profile.gender = dto.gender;
//     if (dto.rollNumber !== undefined) profile.rollNumber = dto.rollNumber;
//     if (dto.dob !== undefined) profile.dob = parseDobOrNull(dto.dob);
//     if (dto.profilePhotoUrl !== undefined) profile.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
//     if (dto.mobileNumber !== undefined) profile.mobileNumber = dto.mobileNumber?.trim() || null;

//     if (dto.classNumber !== undefined) profile.classNumber = dto.classNumber;

//     if (dto.section !== undefined) {
//       const sec = normalizeSection(dto.section);
//       if (sec && !/^[A-Z]{1}$/.test(sec)) {
//         throw new BadRequestException('section must be a single alphabet letter (A-Z)');
//       }
//       profile.section = sec;
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
//         await qr.manager.getRepository(StudentProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Duplicate roll number for this class/section');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();
//       return this.mapStudentResponse(profile, user);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   async deleteStudent(current: RequestUser, studentProfileId: string): Promise<void> {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Student not found');

//     if (profile.user.role !== Role.STUDENT) {
//       throw new BadRequestException('Only student accounts can be deleted here');
//     }

//     await this.userRepo.remove(profile.user);
//   }

//   private mapStudentResponse(profile: StudentProfile, user?: User) {
//     return {
//       id: profile.id,
//       schoolId: profile.schoolId,
//       userId: profile.userId,

//       fullName: profile.fullName,
//       gender: profile.gender,
//       rollNumber: profile.rollNumber,
//       dob: profile.dob ? profile.dob.toISOString().slice(0, 10) : null,

//       email: user?.email ?? null,

//       profilePhotoUrl: profile.profilePhotoUrl,
//       mobileNumber: profile.mobileNumber,

//       classNumber: profile.classNumber,
//       section: profile.section,

//       createdAt: profile.createdAt,
//       updatedAt: profile.updatedAt,
//     };
//   }
// }
















// // src/modules/students/students.service.ts
// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';

// import { Role } from '../../common/enums/role.enum';
// import { RequestUser } from '../../common/types/request-user.type';
// import { hashPassword } from '../../common/utils/crypto.util';

// import { User } from '../users/entities/user.entity';
// import { StudentProfile } from './entities/student-profile.entity';

// import { CreateStudentDto } from './dto/create-student.dto';
// import { UpdateStudentDto } from './dto/update-student.dto';
// import { StudentListQueryDto } from './dto/student-list.query.dto';

// function normalizeSection(section?: string | null): string | null {
//   if (section === undefined || section === null) return null;
//   const s = String(section).trim().toUpperCase();
//   return s.length ? s : null;
// }

// function parseDobOrNull(dob?: string): Date | null {
//   if (!dob) return null;
//   const v = String(dob).trim();
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
//     throw new BadRequestException('dob must be in YYYY-MM-DD format');
//   }
//   const dt = new Date(`${v}T00:00:00.000Z`);
//   if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid dob date');
//   return dt;
// }

// function formatDob(dob: unknown): string | null {
//   if (!dob) return null;

//   // Sometimes TypeORM returns date as string depending on driver/column type
//   if (typeof dob === 'string') {
//     // Expect "YYYY-MM-DD" or ISO
//     if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
//     const d = new Date(dob);
//     return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
//   }

//   if (dob instanceof Date) return dob.toISOString().slice(0, 10);

//   // fallback
//   try {
//     const d = new Date(dob as any);
//     return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
//   } catch {
//     return null;
//   }
// }

// @Injectable()
// export class StudentsService {
//   constructor(
//     private readonly dataSource: DataSource,
//     @InjectRepository(User) private readonly userRepo: Repository<User>,
//     @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
//   ) {}

//   private assertPrincipal(user: RequestUser) {
//     if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage students');
//   }

//   private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
//     if (!user.schoolId || !user.schoolCode) throw new ForbiddenException('School scope missing');
//     return { schoolId: user.schoolId, schoolCode: user.schoolCode };
//   }

//   // =========================================================
//   // CREATE
//   // =========================================================
//   async createStudent(current: RequestUser, dto: CreateStudentDto) {
//     this.assertPrincipal(current);
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     const email = dto.email.trim().toLowerCase();
//     const rollNumber = Number(dto.rollNumber);
//     const classNumber = Number(dto.classNumber);

//     const section = normalizeSection(dto.section);
//     if (section && !/^[A-Z]{1}$/.test(section)) {
//       throw new BadRequestException('section must be a single alphabet letter (A-Z)');
//     }

//     const dob = parseDobOrNull(dto.dob);

//     const saltRounds = 12;
//     const passwordHash = await hashPassword(dto.temporaryPassword, saltRounds);

//     const qr = this.dataSource.createQueryRunner();
//     await qr.connect();

//     try {
//       await qr.startTransaction();

//       // 1) user
//       const userEntity = qr.manager.getRepository(User).create({
//         schoolId,
//         schoolCode,
//         role: Role.STUDENT,
//         email,
//         phone: null, // students use mobileNumber in profile, not user.phone
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
//           throw new ConflictException('Student email already exists in this school');
//         }
//         throw e;
//       }

//       // 2) profile
//       const profile = qr.manager.getRepository(StudentProfile).create({
//         schoolId,
//         userId: createdUser.id,

//         fullName: dto.fullName.trim(),
//         gender: dto.gender,
//         rollNumber,
//         dob,

//         profilePhotoUrl: dto.profilePhotoUrl?.trim() ?? null,
//         mobileNumber: dto.mobileNumber?.trim() ?? null,

//         classNumber,
//         section,
//       });

//       let createdProfile: StudentProfile;
//       try {
//         createdProfile = await qr.manager.getRepository(StudentProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Student already exists for this class/section/rollNumber');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();

//       // Reload with user relation for response
//       const full = await this.studentRepo.findOne({
//         where: { id: createdProfile.id, schoolId },
//         relations: ['user'],
//       });

//       return this.mapStudentResponse(full ?? createdProfile, full?.user ?? createdUser);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   // =========================================================
//   // LIST (FIXED to avoid "databaseName" TypeORM crash)
//   // =========================================================
//   async listStudents(current: RequestUser, query: StudentListQueryDto) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const qb = this.studentRepo.createQueryBuilder('s').leftJoin('s.user', 'u');

//     qb.where('s.school_id = :schoolId', { schoolId });

//     if (query.classNumber) {
//       qb.andWhere('s.class_number = :cn', { cn: Number(query.classNumber) });
//     }

//     if (query.section !== undefined) {
//       const sec = normalizeSection(query.section);
//       if (sec === null) {
//         qb.andWhere('s.section IS NULL');
//       } else {
//         qb.andWhere('UPPER(s.section) = :sec', { sec });
//       }
//     }

//     if (query.search) {
//       const s = query.search.trim();
//       qb.andWhere(
//         new Brackets((b) => {
//           b.where('s.full_name ILIKE :q', { q: `%${s}%` })
//             .orWhere('CAST(s.roll_number AS TEXT) ILIKE :q', { q: `%${s}%` })
//             .orWhere('u.email ILIKE :q', { q: `%${s}%` })
//             .orWhere('COALESCE(s.mobile_number, \'\') ILIKE :q', { q: `%${s}%` });
//         }),
//       );
//     }

//     // IMPORTANT: select only IDs for pagination (avoids TypeORM orderBy+join crash)
//     qb.select('s.id', 'id')
//       .orderBy('s.created_at', 'DESC')
//       .skip(query.skip)
//       .take(query.take);

//     const [rawIds, total] = await Promise.all([qb.getRawMany<{ id: string }>(), qb.getCount()]);
//     const ids = rawIds.map((r) => r.id);

//     const rows = ids.length
//       ? await this.studentRepo.find({
//           where: { id: In(ids), schoolId },
//           relations: ['user'],
//         })
//       : [];

//     // Keep same order as ids
//     const byId = new Map(rows.map((r) => [r.id, r]));
//     const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as StudentProfile[];

//     return {
//       items: ordered.map((p) => this.mapStudentResponse(p, (p as any).user)),
//       total,
//       page: query.page ?? 1,
//       limit: query.take,
//     };
//   }

//   // =========================================================
//   // GET ONE
//   // =========================================================
//   async getStudentById(current: RequestUser, studentProfileId: string) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile) throw new NotFoundException('Student not found');

//     return this.mapStudentResponse(profile, profile.user);
//   }

//   // =========================================================
//   // UPDATE
//   // =========================================================
//   async updateStudent(current: RequestUser, studentProfileId: string, dto: UpdateStudentDto) {
//     this.assertPrincipal(current);
//     const { schoolId, schoolCode } = this.assertSchoolScope(current);

//     if ((dto as any).temporaryPassword !== undefined) {
//       throw new BadRequestException('Use forgot/reset password flow to change password');
//     }

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Student not found');

//     const user = profile.user;

//     // user fields
//     if (dto.email !== undefined) {
//       user.email = dto.email.trim().toLowerCase();
//       user.schoolId = schoolId;
//       user.schoolCode = schoolCode;
//     }

//     // profile fields
//     if (dto.fullName !== undefined) profile.fullName = dto.fullName.trim();
//     if (dto.gender !== undefined) profile.gender = dto.gender;
//     if (dto.profilePhotoUrl !== undefined) profile.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
//     if (dto.mobileNumber !== undefined) profile.mobileNumber = dto.mobileNumber?.trim() || null;

//     if (dto.dob !== undefined) profile.dob = parseDobOrNull(dto.dob);

//     if (dto.rollNumber !== undefined) profile.rollNumber = Number(dto.rollNumber);
//     if (dto.classNumber !== undefined) profile.classNumber = Number(dto.classNumber);

//     if (dto.section !== undefined) {
//       const sec = normalizeSection(dto.section);
//       if (sec && !/^[A-Z]{1}$/.test(sec)) {
//         throw new BadRequestException('section must be a single alphabet letter (A-Z)');
//       }
//       profile.section = sec;
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
//         await qr.manager.getRepository(StudentProfile).save(profile);
//       } catch (e: any) {
//         if (String(e?.code) === '23505') {
//           throw new ConflictException('Student already exists for this class/section/rollNumber');
//         }
//         throw e;
//       }

//       await qr.commitTransaction();
//       return this.mapStudentResponse(profile, user);
//     } catch (e) {
//       await qr.rollbackTransaction();
//       throw e;
//     } finally {
//       await qr.release();
//     }
//   }

//   // =========================================================
//   // DELETE
//   // =========================================================
//   async deleteStudent(current: RequestUser, studentProfileId: string): Promise<void> {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const profile = await this.studentRepo.findOne({
//       where: { id: studentProfileId, schoolId },
//       relations: ['user'],
//     });

//     if (!profile || !profile.user) throw new NotFoundException('Student not found');

//     if (profile.user.role !== Role.STUDENT) {
//       throw new BadRequestException('Only student accounts can be deleted here');
//     }

//     // Delete user -> cascades student_profile due to FK ON DELETE CASCADE
//     await this.userRepo.remove(profile.user);
//   }

//   private mapStudentResponse(profile: StudentProfile, user?: User) {
//     return {
//       id: profile.id,
//       schoolId: profile.schoolId,
//       userId: profile.userId,

//       fullName: profile.fullName,
//       gender: profile.gender,
//       dob: formatDob((profile as any).dob),

//       rollNumber: profile.rollNumber,
//       classNumber: profile.classNumber,
//       section: profile.section,

//       email: user?.email ?? null,
//       mobileNumber: (profile as any).mobileNumber ?? null,

//       profilePhotoUrl: (profile as any).profilePhotoUrl ?? null,

//       createdAt: (profile as any).createdAt ?? null,
//       updatedAt: (profile as any).updatedAt ?? null,
//     };
//   }
// }








//Newly Added
import { In } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { Role } from '../../common/enums/role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { hashPassword } from '../../common/utils/crypto.util';
import { User } from '../users/entities/user.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentListQueryDto } from './dto/student-list.query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentProfile } from './entities/student-profile.entity';

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

function formatDob(dob: unknown): string | null {
  if (!dob) return null;

  if (typeof dob === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
    const d = new Date(dob);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  if (dob instanceof Date) return dob.toISOString().slice(0, 10);

  try {
    const d = new Date(dob as any);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(StudentProfile) private readonly studentRepo: Repository<StudentProfile>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepo: Repository<TeacherProfile>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
    if (!user.schoolId || !user.schoolCode) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId, schoolCode: user.schoolCode };
  }

  private async getTeacherClassScopeOrThrow(current: RequestUser) {
    const { schoolId } = this.assertSchoolScope(current);
    const tp = await this.teacherProfileRepo.findOne({
      where: { schoolId, userId: current.userId },
    });
    if (!tp || !tp.classTeacherClass) {
      throw new ForbiddenException('Only class teachers can manage/view students');
    }
    return {
      classNumber: tp.classTeacherClass,
      section: tp.classTeacherSection ? tp.classTeacherSection.trim().toUpperCase() : null,
    };
  }

  private mapStudentResponse(profile: StudentProfile, user?: User | null) {
    return {
      id: profile.id,
      schoolId: profile.schoolId,
      userId: profile.userId,
      fullName: profile.fullName,
      gender: profile.gender,
      rollNumber: profile.rollNumber,
      dob: formatDob(profile.dob),
      profilePhotoUrl: profile.profilePhotoUrl,
      mobileNumber: profile.mobileNumber,
      classNumber: profile.classNumber,
      section: profile.section,
      email: user?.email ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // CREATE (Principal + Teacher class-teacher only)
  async createStudent(current: RequestUser, dto: CreateStudentDto) {
    const { schoolId, schoolCode } = this.assertSchoolScope(current);

    if (current.role === Role.TEACHER) {
      const scope = await this.getTeacherClassScopeOrThrow(current);
      const dtoSection = normalizeSection(dto.section);
      if (
        Number(dto.classNumber) !== scope.classNumber ||
        (dtoSection ?? null) !== (scope.section ?? null)
      ) {
        throw new ForbiddenException('Teachers can add students only for their class & section');
      }
    } else if (current.role !== Role.PRINCIPAL) {
      throw new ForbiddenException('Only principal/teacher can create students');
    }

    const email = dto.email.trim().toLowerCase();
    const rollNumber = Number(dto.rollNumber);
    const classNumber = Number(dto.classNumber);
    const section = normalizeSection(dto.section);
    const dob = parseDobOrNull(dto.dob);

    const saltRounds = 12;
    const passwordHash = await hashPassword(dto.temporaryPassword, saltRounds);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      await qr.startTransaction();

      const userEntity = qr.manager.getRepository(User).create({
        schoolId,
        schoolCode,
        role: Role.STUDENT,
        email,
        phone: null,
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
          throw new ConflictException('Email already exists in this school');
        }
        throw e;
      }

      const profileEntity = qr.manager.getRepository(StudentProfile).create({
        schoolId,
        userId: createdUser.id,
        fullName: dto.fullName.trim(),
        gender: dto.gender,
        rollNumber,
        dob,
        profilePhotoUrl: dto.profilePhotoUrl?.trim() || null,
        mobileNumber: dto.mobileNumber?.trim() || null,
        classNumber,
        section,
      });

      let createdProfile: StudentProfile;
      try {
        createdProfile = await qr.manager.getRepository(StudentProfile).save(profileEntity);
      } catch (e: any) {
        if (String(e?.code) === '23505') {
          throw new ConflictException('Student already exists for this class/section/rollNumber');
        }
        throw e;
      }

      await qr.commitTransaction();

      const full = await this.studentRepo.findOne({
        where: { id: createdProfile.id },
        relations: ['user'],
      });

      return this.mapStudentResponse(full ?? createdProfile, full?.user ?? createdUser);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // LIST (Principal: all + filters) (Teacher: own class only)
  async listStudents(current: RequestUser, query: StudentListQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    let fixedClass: number | null = null;
    let fixedSection: string | null = null;

    if (current.role === Role.TEACHER) {
      const scope = await this.getTeacherClassScopeOrThrow(current);
      fixedClass = scope.classNumber;
      fixedSection = scope.section;
    } else if (current.role !== Role.PRINCIPAL) {
      throw new ForbiddenException('Only principal/teacher can view students');
    }

    const qb = this.studentRepo.createQueryBuilder('s').leftJoin('s.user', 'u');
    qb.where('s.school_id = :schoolId', { schoolId });

    if (fixedClass !== null) {
      qb.andWhere('s.class_number = :cnFixed', { cnFixed: fixedClass });
      if (fixedSection === null) qb.andWhere('s.section IS NULL');
      else qb.andWhere('UPPER(s.section) = :secFixed', { secFixed: fixedSection });
    } else {
      if (query.classNumber !== undefined) qb.andWhere('s.class_number = :cn', { cn: Number(query.classNumber) });
      if (query.section !== undefined) {
        const sec = normalizeSection(query.section);
        if (sec === null) qb.andWhere('s.section IS NULL');
        else qb.andWhere('UPPER(s.section) = :sec', { sec });
      }
    }

    if (query.search) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(s.full_name) LIKE :search', { search }).orWhere('LOWER(u.email) LIKE :search', { search });
        }),
      );
    }

    qb.orderBy('s.class_number', 'ASC').addOrderBy('s.section', 'ASC').addOrderBy('s.roll_number', 'ASC');

    const items = await qb.getMany();
    const userIds = items.map((x) => x.userId);
    const users = userIds.length
  ? await this.userRepo.find({ where: { id: In(userIds) } })
  : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return items.map((p) => this.mapStudentResponse(p, userMap.get(p.userId) ?? null));
  }

  // GET (Principal: any) (Teacher: own class only)
  async getStudentById(current: RequestUser, studentProfileId: string) {
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.studentRepo.findOne({
      where: { id: studentProfileId, schoolId },
      relations: ['user'],
    });
    if (!profile) throw new ForbiddenException('Student not found');

    if (current.role === Role.TEACHER) {
      const scope = await this.getTeacherClassScopeOrThrow(current);
      if (profile.classNumber !== scope.classNumber || (profile.section ?? null) !== (scope.section ?? null)) {
        throw new ForbiddenException('Teachers can view only their class students');
      }
    } else if (current.role !== Role.PRINCIPAL) {
      throw new ForbiddenException('Only principal/teacher can view students');
    }

    return this.mapStudentResponse(profile, profile.user);
  }

  // UPDATE (Principal only - controller already restricts)
  async updateStudent(current: RequestUser, studentProfileId: string, dto: UpdateStudentDto) {
    if (current.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can update students');

    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.studentRepo.findOne({ where: { id: studentProfileId, schoolId } });
    if (!profile) throw new ForbiddenException('Student not found');

    if (dto.fullName !== undefined) profile.fullName = dto.fullName.trim();
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.rollNumber !== undefined) profile.rollNumber = Number(dto.rollNumber);
    if (dto.dob !== undefined) profile.dob = parseDobOrNull(dto.dob);
    if (dto.profilePhotoUrl !== undefined) profile.profilePhotoUrl = dto.profilePhotoUrl?.trim() || null;
    if (dto.mobileNumber !== undefined) profile.mobileNumber = dto.mobileNumber?.trim() || null;
    if (dto.classNumber !== undefined) profile.classNumber = Number(dto.classNumber);
    if (dto.section !== undefined) profile.section = normalizeSection(dto.section);

    try {
      const saved = await this.studentRepo.save(profile);
      const full = await this.studentRepo.findOne({ where: { id: saved.id }, relations: ['user'] });
      return this.mapStudentResponse(full ?? saved, full?.user ?? null);
    } catch (e: any) {
      if (String(e?.code) === '23505') {
        throw new ConflictException('Student already exists for this class/section/rollNumber');
      }
      throw e;
    }
  }

  // DELETE (Principal only - controller already restricts)
  async deleteStudent(current: RequestUser, studentProfileId: string) {
    if (current.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can delete students');
    const { schoolId } = this.assertSchoolScope(current);

    const profile = await this.studentRepo.findOne({ where: { id: studentProfileId, schoolId } });
    if (!profile) throw new ForbiddenException('Student not found');

    // Delete profile + user (transaction)
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(StudentProfile).delete({ id: profile.id });
      await m.getRepository(User).delete({ id: profile.userId });
    });

    return { success: true };
  }
}
