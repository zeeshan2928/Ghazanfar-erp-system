import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Local-disk implementation of file storage - files live under
 * <project-root>/uploads, served back over HTTP via the /uploads static
 * route registered in main.ts. Wherever this backend actually runs (a dev
 * machine today, the production VPS once deployed there) is where the files
 * physically live, so "local" and "the server" are the same thing here.
 * Kept behind this one method so a real cloud/object-storage backend
 * (S3-compatible, etc.) can replace the implementation later without
 * touching any caller.
 */
@Injectable()
export class MediaStorageService {
  private readonly uploadRoot = path.join(process.cwd(), 'uploads');

  async save(subfolder: string, buffer: Buffer, originalName: string): Promise<{ url: string }> {
    const dir = path.join(this.uploadRoot, subfolder);
    await fs.promises.mkdir(dir, { recursive: true });
    const ext = path.extname(originalName) || '';
    const filename = `${randomUUID()}${ext}`;
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return { url: `/uploads/${subfolder}/${filename}` };
  }

  async delete(url: string): Promise<void> {
    const relative = url.replace(/^\/uploads\//, '');
    const filePath = path.join(this.uploadRoot, relative);
    await fs.promises.unlink(filePath).catch(() => undefined);
  }
}
