import { db } from '../db';
import { DateTime } from 'luxon';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

function diffMs(beforeJSDate: Date): number {
  const now = DateTime.utc();
  const before = DateTime.fromJSDate(beforeJSDate);
  const diff = now.diff(before);
  return diff.milliseconds;
}

export class ImageCache {
  public static cachePath = '/images';
  public static pnBaseUrl = 'https://puyonexus.com';
  public static expirationTime = 30 * 24 * 60 * 60 * 1000;

  public static async get(url: string, forceDownload = false): Promise<Buffer> {
    if (!url.startsWith(ImageCache.pnBaseUrl)) {
      throw Error('Image is not from Puyo Nexus');
    }

    const data = await db.oneOrNone(`SELECT * FROM image_cache WHERE external_url = $1`, [url]);

    if (!data || forceDownload || (data && diffMs(data['updated_at']) >= ImageCache.expirationTime)) {
      return ImageCache.set(url);
    } else {
      try {
        return fs.readFileSync(data['filepath']);
      } catch {
        // In case the entry was in the database, but not actually on disk for some reason.
        return ImageCache.set(url);
      }
    }
  }

  public static async set(url: string): Promise<Buffer> {
    const img = await axios
      .get<Buffer>(url, { responseType: 'arraybuffer' })
      .then((res) => res.data);

    const outputPath = path.join(ImageCache.cachePath, url.replace(ImageCache.pnBaseUrl, ''));
    const outputDir = outputPath.split('/').slice(0, -1).join('/');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, img);

    await db.none(
      `
      INSERT INTO image_cache(external_url, filepath, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (external_url)
      DO UPDATE SET filepath = EXCLUDED.filepath,
                    updated_at = EXCLUDED.updated_at
    `,
      [url, outputPath, new Date()],
    );

    return img;
  }
}
