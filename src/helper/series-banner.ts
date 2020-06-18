import { Wiki } from '../wiki/api';
import { createCanvas, Image, loadImage } from 'canvas';

async function getSeriesBanner(fileNames: string[]): Promise<Buffer | undefined> {
  if (fileNames.length === 0) return;
  const icons: Image[] = [];
  for (let i = 0; i < fileNames.length; i++) {
    const iconURL = await Wiki.getImageURL(fileNames[i]);
    if (!iconURL) continue;
    const icon = await loadImage(iconURL);
    icons.push(icon);
  }

  const canvas = createCanvas(icons[0].width * icons.length, icons[0].height);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < icons.length; i++) {
    ctx.drawImage(icons[i], icons[0].width * i, 0);
  }

  return canvas.toBuffer();
}

export { getSeriesBanner };
