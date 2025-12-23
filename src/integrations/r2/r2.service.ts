import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { buildR2ObjectKey, inferContentTypeFromExt, toPublicFileUrl } from '../../common/utils/file.util';
import { PresignedUploadResult, R2Config } from './r2.types';

@Injectable()
export class R2Service {
  private client: S3Client | null = null;
  private cfg: R2Config | null = null;

  constructor(private readonly config: ConfigService) {
    this.initIfPossible();
  }

  private initIfPossible() {
    const endpoint = this.config.get<string | undefined>('r2.endpoint');
    const region = this.config.get<string | undefined>('r2.region') ?? 'auto';
    const accessKeyId = this.config.get<string | undefined>('r2.accessKeyId');
    const secretAccessKey = this.config.get<string | undefined>('r2.secretAccessKey');
    const bucket = this.config.get<string | undefined>('r2.bucket');
    const publicBaseUrl = this.config.get<string | undefined>('r2.publicBaseUrl');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ R2 not configured. Upload features will be disabled until configured.');
      this.client = null;
      this.cfg = null;
      return;
    }

    this.cfg = {
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicBaseUrl: publicBaseUrl || undefined,
    };

    this.client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // important for many S3 compatible providers
    });

    // eslint-disable-next-line no-console
    console.log('✅ R2 (S3) client initialized');
  }

  isEnabled(): boolean {
    return !!this.client && !!this.cfg;
  }

  /**
   * Create a presigned URL for direct upload from mobile apps.
   * This is the best approach for performance (no file streaming through backend).
   */
  async createPresignedUpload(params: {
    schoolCode: string;
    folder: string; // e.g. 'teachers/profile' or 'circulars'
    filename: string;
    expiresInSeconds?: number; // default 300
  }): Promise<PresignedUploadResult> {
    if (!this.client || !this.cfg) {
      throw new Error('R2 not configured');
    }

    const expiresInSeconds = params.expiresInSeconds ?? 300;
    const safeKey = buildR2ObjectKey([
      'schools',
      params.schoolCode,
      params.folder,
      `${Date.now()}-${params.filename}`,
    ]);

    const contentType = inferContentTypeFromExt(params.filename);

    const command = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: safeKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      uploadUrl,
      objectKey: safeKey,
      publicUrl: toPublicFileUrl(this.cfg.publicBaseUrl, safeKey),
      expiresInSeconds,
    };
  }
}
