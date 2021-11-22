import { Wiki } from '../wiki/api';
import { createCanvas, Image, loadImage } from 'canvas';
import { ImageCache } from '../wiki/image-cache';

async function getSeriesBanner(fileNames: string[]): Promise<Buffer | undefined> {
  if (fileNames.length === 0) return;
  const icons = (
    await Promise.all(
      fileNames.map(async (fileName) => {
        const iconURL = await Wiki.getImageURL(fileName);
        if (!iconURL) return;
        const iconBuffer = await ImageCache.get(iconURL);
        return await loadImage(iconBuffer);
      }),
    )
  ).filter((icon) => !!icon) as Image[];

  const canvas = createCanvas(icons[0].width * icons.length, icons[0].height);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < icons.length; i++) {
    ctx.drawImage(icons[i], icons[0].width * i, 0);
  }

  return canvas.toBuffer();
}

export { getSeriesBanner };
