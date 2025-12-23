export type PresignedUploadResult = {
  uploadUrl: string;
  objectKey: string;
  publicUrl?: string;
  expiresInSeconds: number;
};

export type R2Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
};
