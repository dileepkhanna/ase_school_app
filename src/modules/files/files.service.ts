import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { R2Service } from '../../integrations/r2/r2.service';
import { RequestUser } from '../../common/types/request-user.type';

import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { FinalizeUploadDto } from './dto/finalize-upload.dto';

function safeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 160);
}

function validateKind(kind: 'IMAGE' | 'PDF' | 'ANY' | undefined, contentType: string) {
  const ct = contentType.toLowerCase();
  if (!kind || kind === 'ANY') return;

  if (kind === 'IMAGE') {
    if (!ct.startsWith('image/')) throw new BadRequestException('Only image uploads are allowed');
    return;
  }

  if (kind === 'PDF') {
    if (ct !== 'application/pdf') throw new BadRequestException('Only PDF uploads are allowed');
  }
}

@Injectable()
export class FilesService {
  constructor(private readonly r2: R2Service) {}

  private assertSchoolScope(user: RequestUser): { schoolId: string; schoolCode: string } {
    if (!user.schoolId) throw new ForbiddenException('School scope missing');

    const schoolCode = String((user as any).schoolCode ?? '').trim();
    if (!schoolCode) throw new ForbiddenException('School code missing in token');

    return { schoolId: user.schoolId, schoolCode };
  }

  /**
   * Step 1: Ask backend for a presigned PUT URL
   */
  async createPresignedUrl(current: RequestUser, dto: CreatePresignedUrlDto) {
    const { schoolCode } = this.assertSchoolScope(current);

    validateKind(dto.kind, dto.contentType);

    if (dto.sizeBytes && dto.sizeBytes > 50 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 50MB)');
    }

    const folder = safeName(String(dto.folder ?? '').toLowerCase());
    if (!folder) throw new BadRequestException('Invalid folder');

    const baseFilename = safeName(String(dto.filename ?? ''));
    if (!baseFilename) throw new BadRequestException('Invalid filename');

    // ✅ final filename used in R2
    const finalFilename = `${Date.now()}_${current.userId}_${baseFilename}`;

    // ✅ key format must match your R2Service implementation convention
    const key = `schools/${schoolCode}/${folder}/${finalFilename}`;

    // ✅ R2 service creates presigned URL using schoolCode + folder + filename
    const presigned = await this.r2.createPresignedUpload({
      schoolCode,
      folder,
      filename: finalFilename,
      expiresInSeconds: 60 * 10,
    });

    return {
      key, // ✅ generated here (since PresignedUploadResult has no key)
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }

  /**
   * Step 2: Client calls backend after upload is done (optional but recommended)
   */
  async finalizeUpload(_current: RequestUser, dto: FinalizeUploadDto) {
    if (!dto.key || !dto.url) throw new BadRequestException('Missing key/url');
    return { message: 'Upload finalized', key: dto.key, url: dto.url, etag: dto.etag ?? null };
  }
}
