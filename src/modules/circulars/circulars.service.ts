// import {
//   BadRequestException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Brackets, DataSource, Repository } from 'typeorm';

// import { Circular } from './entities/circular.entity';
// import { CircularReadState } from './entities/circular-read-state.entity';

// import { CreateCircularDto } from './dto/create-circular.dto';
// import { UpdateCircularDto } from './dto/update-circular.dto';
// import { CircularListQueryDto } from './dto/circular-list.query.dto';

// import { RequestUser } from '../../common/types/request-user.type';
// import { Role } from '../../common/enums/role.enum';
// import { CircularType } from '../../common/enums/circular-type.enum';

// import { FcmService } from '../../integrations/firebase/fcm.service';

// @Injectable()
// export class CircularsService {
//   constructor(
//     private readonly dataSource: DataSource,
//     private readonly fcm: FcmService,
//     @InjectRepository(Circular) private readonly circularRepo: Repository<Circular>,
//     @InjectRepository(CircularReadState) private readonly readRepo: Repository<CircularReadState>,
//   ) {}

//   private assertSchoolScope(user: RequestUser): { schoolId: string } {
//     if (!user.schoolId) throw new ForbiddenException('School scope missing');
//     return { schoolId: user.schoolId };
//   }

//   private assertPrincipal(user: RequestUser) {
//     if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage circulars');
//   }

//   // -------------------------
//   // Principal: Create circular
//   // -------------------------
//   async create(current: RequestUser, dto: CreateCircularDto) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const row = this.circularRepo.create({
//       schoolId,
//       type: dto.type,
//       title: dto.title.trim(),
//       description: dto.description.trim(),
//       images: dto.images?.length ? dto.images : null,
//       publishDate: new Date(),
//       createdBy: current.userId,
//       isActive: true,
//     });

//     const saved = await this.circularRepo.save(row);

//     // Push + notifications feed (Teacher + Student)
//     await this.publishToSchoolUsers({
//       schoolId,
//       circular: saved,
//     });

//     return saved;
//   }

//   // -------------------------
//   // List circulars (All roles)
//   // Teacher/Student: only active
//   // Principal: can filter active/inactive
//   // -------------------------
//   async list(current: RequestUser, query: CircularListQueryDto) {
//     const { schoolId } = this.assertSchoolScope(current);

//     const qb = this.circularRepo
//       .createQueryBuilder('c')
//       .where('c.school_id = :schoolId', { schoolId })
//       .andWhere('c.type = :type', { type: query.type });

//     if (current.role !== Role.PRINCIPAL) {
//       qb.andWhere('c.is_active = true');
//     } else if (query.isActive !== undefined) {
//       qb.andWhere('c.is_active = :isActive', { isActive: query.isActive });
//     }

//     if (query.search) {
//       const s = query.search.trim();
//       qb.andWhere(
//         new Brackets((b) => {
//           b.where('c.title ILIKE :q', { q: `%${s}%` }).orWhere('c.description ILIKE :q', {
//             q: `%${s}%`,
//           });
//         }),
//       );
//     }

//     qb.orderBy('c.publish_date', 'DESC').skip(query.skip).take(query.take);

//     const [rows, total] = await qb.getManyAndCount();

//     return {
//       items: rows.map((c) => ({
//         id: c.id,
//         type: c.type,
//         title: c.title,
//         descriptionPreview: c.description.length > 160 ? c.description.slice(0, 160) + '…' : c.description,
//         images: c.images,
//         publishDate: c.publishDate,
//         createdBy: c.createdBy,
//         isActive: c.isActive,
//       })),
//       total,
//       page: query.page ?? 1,
//       limit: query.take,
//     };
//   }

//   // -------------------------
//   // Get one circular (All roles)
//   // Teacher/Student: only active
//   // -------------------------
//   async getOne(current: RequestUser, id: string) {
//     const { schoolId } = this.assertSchoolScope(current);

//     const c = await this.circularRepo.findOne({ where: { id, schoolId } });
//     if (!c) throw new NotFoundException('Circular not found');

//     if (current.role !== Role.PRINCIPAL && !c.isActive) {
//       throw new NotFoundException('Circular not found');
//     }

//     return c;
//   }

//   // -------------------------
//   // Principal: Update
//   // -------------------------
//   async update(current: RequestUser, id: string, dto: UpdateCircularDto) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const c = await this.circularRepo.findOne({ where: { id, schoolId } });
//     if (!c) throw new NotFoundException('Circular not found');

//     if (dto.type !== undefined) c.type = dto.type;
//     if (dto.title !== undefined) c.title = dto.title.trim();
//     if (dto.description !== undefined) c.description = dto.description.trim();
//     if (dto.images !== undefined) c.images = dto.images?.length ? dto.images : null;

//     const saved = await this.circularRepo.save(c);

//     // Sync rule: changes must reflect immediately — no extra work needed,
//     // list/get endpoints show updated data immediately.
//     return saved;
//   }

//   // -------------------------
//   // Principal: Delete
//   // -------------------------
//   async remove(current: RequestUser, id: string) {
//     this.assertPrincipal(current);
//     const { schoolId } = this.assertSchoolScope(current);

//     const c = await this.circularRepo.findOne({ where: { id, schoolId } });
//     if (!c) throw new NotFoundException('Circular not found');

//     await this.circularRepo.remove(c);
//     // Unseen counts will automatically adjust because circular row is removed.
//     return { message: 'Deleted' };
//   }

//   // -------------------------
//   // Mark category as seen (Teacher/Student typically, but allow Principal too)
//   // -------------------------
//   async markSeen(current: RequestUser, type: CircularType) {
//     const { schoolId } = this.assertSchoolScope(current);

//     await this.dataSource.query(
//       `
//       INSERT INTO circular_read_states (school_id, user_id, type, last_seen_at, updated_at)
//       VALUES ($1, $2, $3, now(), now())
//       ON CONFLICT (school_id, user_id, type)
//       DO UPDATE SET last_seen_at=now(), updated_at=now();
//       `,
//       [schoolId, current.userId, type],
//     );

//     return { message: 'Marked as seen' };
//   }

//   // -------------------------
//   // Unseen count for one type
//   // -------------------------
//   async unseenCount(current: RequestUser, type: CircularType): Promise<{ type: CircularType; unseen: number }> {
//     const { schoolId } = this.assertSchoolScope(current);

//     const rows = await this.dataSource.query(
//       `
//       SELECT COUNT(*)::int AS cnt
//       FROM circulars c
//       LEFT JOIN circular_read_states rs
//         ON rs.school_id = c.school_id AND rs.user_id = $2 AND rs.type = c.type
//       WHERE c.school_id = $1
//         AND c.type = $3
//         AND c.is_active = true
//         AND c.publish_date > COALESCE(rs.last_seen_at, to_timestamp(0));
//       `,
//       [schoolId, current.userId, type],
//     );

//     return { type, unseen: Number(rows?.[0]?.cnt ?? 0) };
//   }

//   // -------------------------
//   // Unseen counts for all types
//   // -------------------------
//   async unseenCountsAll(current: RequestUser) {
//     const { schoolId } = this.assertSchoolScope(current);

//     const types = Object.values(CircularType);

//     const result: Record<string, number> = {};
//     for (const t of types) {
//       const r = await this.unseenCount(current, t as CircularType);
//       result[String(t)] = r.unseen;
//     }

//     return result;
//   }

//   // =========================================================
//   // Internal: Publish notifications + push
//   // =========================================================
//   private async publishToSchoolUsers(params: { schoolId: string; circular: Circular }) {
//     const { schoolId, circular } = params;

//     const title = circular.title;
//     const hasImages = !!(circular.images && circular.images.length);
//     const imageUrl = hasImages ? circular.images![0] : null;

//     // Push payload logic:
//     const body = hasImages ? null : circular.description;

//     // 1) Insert notification feed item for ALL teacher + student users
//     await this.dataSource.query(
//       `
//       INSERT INTO notifications (school_id, user_id, title, body, image_url, data, is_read, created_at)
//       SELECT
//         $1, u.id, $2, $3, $4, $5::jsonb, false, now()
//       FROM users u
//       WHERE u.school_id = $1
//         AND u.is_active = true
//         AND u.role IN ('TEACHER', 'STUDENT');
//       `,
//       [
//         schoolId,
//         title,
//         body,
//         imageUrl,
//         JSON.stringify({
//           type: 'CIRCULAR',
//           circularType: circular.type,
//           circularId: circular.id,
//         }),
//       ],
//     );

//     // 2) Push to all their device tokens (best-effort)
//     if (!this.fcm.isEnabled()) return;

//     const tokenRows: Array<{ fcm_token: string }> = await this.dataSource.query(
//       `
//       SELECT DISTINCT dt.fcm_token
//       FROM device_tokens dt
//       JOIN users u ON u.id = dt.user_id
//       WHERE u.school_id = $1
//         AND u.is_active = true
//         AND u.role IN ('TEACHER', 'STUDENT');
//       `,
//       [schoolId],
//     );

//     const tokens = tokenRows.map((r) => r.fcm_token).filter(Boolean);
//     if (!tokens.length) return;

//     // Chunk to avoid oversized requests
//     const chunkSize = 500;
//     for (let i = 0; i < tokens.length; i += chunkSize) {
//       const chunk = tokens.slice(i, i + chunkSize);
//       await this.fcm.sendToTokens(chunk, {
//         title,
//         body: hasImages ? '' : circular.description,
//         imageUrl: imageUrl ?? undefined,
//         data: {
//           type: 'CIRCULAR',
//           circularType: String(circular.type),
//           circularId: circular.id,
//         },
//       });
//     }
//   }
// }










import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';

import { Circular } from './entities/circular.entity';
import { CircularReadState } from './entities/circular-read-state.entity';

import { CreateCircularDto } from './dto/create-circular.dto';
import { UpdateCircularDto } from './dto/update-circular.dto';
import { CircularListQueryDto } from './dto/circular-list.query.dto';

import { RequestUser } from '../../common/types/request-user.type';
import { Role } from '../../common/enums/role.enum';
import { CircularType } from '../../common/enums/circular-type.enum';

import { FcmService } from '../../integrations/firebase/fcm.service';

function parsePublishDateOrNow(v?: string): Date {
  if (!v) return new Date();
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new BadRequestException('publishDate must be a valid ISO date string');
  return d;
}

function normalizeImages(a?: string[] | null): string[] | null {
  const cleaned = (a ?? [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 10);
  return cleaned.length ? cleaned : null;
}

@Injectable()
export class CircularsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fcm: FcmService,
    @InjectRepository(Circular) private readonly circularRepo: Repository<Circular>,
    @InjectRepository(CircularReadState) private readonly readRepo: Repository<CircularReadState>,
  ) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');
    return { schoolId: user.schoolId };
  }

  private assertPrincipal(user: RequestUser) {
    if (user.role !== Role.PRINCIPAL) throw new ForbiddenException('Only principal can manage circulars');
  }

  // -------------------------
  // Principal: Create circular
  // -------------------------
  async create(current: RequestUser, dto: CreateCircularDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    // ✅ accept both `images` and `imageUrls`
    const imgs = normalizeImages(dto.images ?? dto.imageUrls ?? null);

    const row = this.circularRepo.create({
      schoolId,
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description.trim(),
      images: imgs,
      publishDate: parsePublishDateOrNow(dto.publishDate),
      createdBy: current.userId,
      isActive: true,
    });

    const saved = await this.circularRepo.save(row);

    // Push + notifications feed (Teacher + Student)
    await this.publishToSchoolUsers({
      schoolId,
      circular: saved,
    });

    return saved;
  }

  // -------------------------
  // List circulars (All roles)
  // Teacher/Student: only active
  // Principal: can filter active/inactive
  // -------------------------
  async list(current: RequestUser, query: CircularListQueryDto) {
    const { schoolId } = this.assertSchoolScope(current);

    const qb = this.circularRepo
      .createQueryBuilder('c')
      .where('c.school_id = :schoolId', { schoolId })
      .andWhere('c.type = :type', { type: query.type });

    if (current.role !== Role.PRINCIPAL) {
      qb.andWhere('c.is_active = true');
    } else if (query.isActive !== undefined) {
      qb.andWhere('c.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      const s = query.search.trim();
      qb.andWhere(
        new Brackets((b) => {
          b.where('c.title ILIKE :q', { q: `%${s}%` }).orWhere('c.description ILIKE :q', {
            q: `%${s}%`,
          });
        }),
      );
    }

    qb.orderBy('c.publish_date', 'DESC').skip(query.skip).take(query.take);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        descriptionPreview: c.description.length > 160 ? c.description.slice(0, 160) + '…' : c.description,

        // ✅ return both keys so frontend won’t break
        images: c.images,
        imageUrls: c.images,

        publishDate: c.publishDate,
        createdBy: c.createdBy,
        isActive: c.isActive,
      })),
      total,
      page: query.page ?? 1,
      limit: query.take,
    };
  }

  // -------------------------
  // Get one circular (All roles)
  // Teacher/Student: only active
  // -------------------------
  async getOne(current: RequestUser, id: string) {
    const { schoolId } = this.assertSchoolScope(current);

    const c = await this.circularRepo.findOne({ where: { id, schoolId } });
    if (!c) throw new NotFoundException('Circular not found');

    if (current.role !== Role.PRINCIPAL && !c.isActive) {
      throw new NotFoundException('Circular not found');
    }

    // ✅ add compatibility in response
    return {
      ...c,
      imageUrls: c.images,
    };
  }

  // -------------------------
  // Principal: Update
  // -------------------------
  async update(current: RequestUser, id: string, dto: UpdateCircularDto) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const c = await this.circularRepo.findOne({ where: { id, schoolId } });
    if (!c) throw new NotFoundException('Circular not found');

    if (dto.type !== undefined) c.type = dto.type;
    if (dto.title !== undefined) c.title = dto.title.trim();
    if (dto.description !== undefined) c.description = dto.description.trim();

    // ✅ update images if either field comes (if your UpdateCircularDto has only images, this still works)
    const anyDto: any = dto as any;
    if (anyDto.images !== undefined || anyDto.imageUrls !== undefined) {
      const imgs = normalizeImages(anyDto.images ?? anyDto.imageUrls ?? null);
      c.images = imgs;
    }

    // ✅ allow publishDate update if you add it in UpdateCircularDto later
    if ((dto as any).publishDate !== undefined) {
      c.publishDate = parsePublishDateOrNow((dto as any).publishDate);
    }

    const saved = await this.circularRepo.save(c);
    return {
      ...saved,
      imageUrls: saved.images,
    };
  }

  // -------------------------
  // Principal: Delete
  // -------------------------
  async remove(current: RequestUser, id: string) {
    this.assertPrincipal(current);
    const { schoolId } = this.assertSchoolScope(current);

    const c = await this.circularRepo.findOne({ where: { id, schoolId } });
    if (!c) throw new NotFoundException('Circular not found');

    await this.circularRepo.remove(c);
    return { message: 'Deleted' };
  }

  // -------------------------
  // Mark category as seen (Teacher/Student typically, but allow Principal too)
  // -------------------------
  async markSeen(current: RequestUser, type: CircularType) {
    const { schoolId } = this.assertSchoolScope(current);

    await this.dataSource.query(
      `
      INSERT INTO circular_read_states (school_id, user_id, type, last_seen_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (school_id, user_id, type)
      DO UPDATE SET last_seen_at=now(), updated_at=now();
      `,
      [schoolId, current.userId, type],
    );

    return { message: 'Marked as seen' };
  }

  // -------------------------
  // Unseen count for one type
  // -------------------------
  async unseenCount(current: RequestUser, type: CircularType): Promise<{ type: CircularType; unseen: number }> {
    const { schoolId } = this.assertSchoolScope(current);

    const rows = await this.dataSource.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM circulars c
      LEFT JOIN circular_read_states rs
        ON rs.school_id = c.school_id AND rs.user_id = $2 AND rs.type = c.type
      WHERE c.school_id = $1
        AND c.type = $3
        AND c.is_active = true
        AND c.publish_date > COALESCE(rs.last_seen_at, to_timestamp(0));
      `,
      [schoolId, current.userId, type],
    );

    return { type, unseen: Number(rows?.[0]?.cnt ?? 0) };
  }

  // -------------------------
  // Unseen counts for all types
  // -------------------------
  async unseenCountsAll(current: RequestUser) {
    const types = Object.values(CircularType);
    const result: Record<string, number> = {};

    for (const t of types) {
      const r = await this.unseenCount(current, t as CircularType);
      result[String(t)] = r.unseen;
    }

    return result;
  }

  // =========================================================
  // Internal: Publish notifications + push
  // =========================================================
  private async publishToSchoolUsers(params: { schoolId: string; circular: Circular }) {
    const { schoolId, circular } = params;

    const title = circular.title;
    const hasImages = !!(circular.images && circular.images.length);
    const imageUrl = hasImages ? circular.images![0] : null;

    const body = hasImages ? null : circular.description;

    // 1) Insert notification feed item for ALL teacher + student users
    await this.dataSource.query(
      `
      INSERT INTO notifications (school_id, user_id, title, body, image_url, data, is_read, created_at)
      SELECT
        $1, u.id, $2, $3, $4, $5::jsonb, false, now()
      FROM users u
      WHERE u.school_id = $1
        AND u.is_active = true
        AND u.role IN ('TEACHER', 'STUDENT');
      `,
      [
        schoolId,
        title,
        body,
        imageUrl,
        JSON.stringify({
          type: 'CIRCULAR',
          circularType: circular.type,
          circularId: circular.id,
        }),
      ],
    );

    // 2) Push to all their device tokens (best-effort)
    if (!this.fcm.isEnabled()) return;

    const tokenRows: Array<{ fcm_token: string }> = await this.dataSource.query(
      `
      SELECT DISTINCT dt.fcm_token
      FROM device_tokens dt
      JOIN users u ON u.id = dt.user_id
      WHERE u.school_id = $1
        AND u.is_active = true
        AND u.role IN ('TEACHER', 'STUDENT');
      `,
      [schoolId],
    );

    const tokens = tokenRows.map((r) => r.fcm_token).filter(Boolean);
    if (!tokens.length) return;

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      await this.fcm.sendToTokens(chunk, {
        title,
        body: hasImages ? '' : circular.description,
        imageUrl: imageUrl ?? undefined,
        data: {
          type: 'CIRCULAR',
          circularType: String(circular.type),
          circularId: circular.id,
        },
      });
    }
  }
}
