import { db } from '../db';
import { DateTime } from 'luxon';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class ImageCache {
  public static cachePath = '/images';
  public static pnBaseUrl = 'https://puyonexus.com';
  public static expirationTime = 30 * 24 * 60 * 60 * 1000;

  public static async get(url: string, forceDownload = false): Promise<Buffer> {
    if (!url.startsWith(ImageCache.pnBaseUrl)) {
      throw Error('Image is not from Puyo Nexus');
    }
    
    const data = await db.oneOrNone(`SELECT * FROM image_cache WHERE external_url = $1`, [url]);
    console.log(data);

    const now = DateTime.utc();
    const before = DateTime.fromJSDate(data['updated_at']);
    const diff = now.diff(before);
    const diffMs = diff.milliseconds;
    
    if (!data || forceDownload || diffMs >= ImageCache.expirationTime) {
      return ImageCache.set(url);
    } else {
      return fs.readFileSync(data['filepath']);
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
