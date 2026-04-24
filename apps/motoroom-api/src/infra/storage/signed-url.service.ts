import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime'
]);

export type PrepareUploadInput = {
  ownerUserId: string;
  groupId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export class SignedUrlService {
  prepareUpload(input: PrepareUploadInput) {
    if (!allowedMimeTypes.has(input.mimeType)) {
      throw new AppError('MEDIA_TYPE_NOT_ALLOWED', 'This media type is not allowed.', 422);
    }

    if (input.sizeBytes > env.MEDIA_MAX_BYTES) {
      throw new AppError('MEDIA_TOO_LARGE', 'Media file exceeds MotoRoom size limit.', 422);
    }

    const extension = input.fileName.split('.').pop()?.toLowerCase() ?? 'bin';
    const prefix = input.groupId ? `groups/${input.groupId}` : `users/${input.ownerUserId}`;
    const storageKey = `${prefix}/${randomUUID()}.${extension}`;

    return {
      storageKey,
      uploadUrl: `${env.S3_ENDPOINT ?? 'https://object-storage.example.com'}/${env.S3_BUCKET}/${storageKey}?signed=placeholder`,
      expiresInSeconds: env.SIGNED_URL_TTL_SECONDS
    };
  }
}

