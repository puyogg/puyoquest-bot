import * as Discord from 'discord.js';
import fetch from 'node-fetch';
import { getFullCardID, parseTemplateText } from '../wiki/parser';
import { Wiki } from '../wiki/api';
import { createCanvas, loadImage, Image } from 'canvas';
import * as path from 'path';

class TenRoll {
  private message: Discord.Message;

  constructor(message: Discord.Message) {
    this.message = message;
  }

  /**
   * Gets a random icon from the card index and returns the canvas loaded image
   */
  private async getRandomIcon(): Promise<Image | undefined> {
    let randCard = Wiki.getRandomCard();
    while (randCard && randCard.id && ['1239', '2239', '3239', '4239', '5239', '1238'].includes(randCard.id)) {
      randCard = Wiki.getRandomCard();
    }
    if (!randCard || !randCard.id || !randCard.name) {
      this.message.channel.send(`Error: There was a problem fetching the card list.`);
      return;
    }

    // Get random rarity
    let rarities = await Wiki.getCharRaritiesFromID(randCard.id);
    if (!rarities) {
      return;
    }
    rarities = rarities.filter((rarity) => rarity !== '7');
    const randRarity = rarities[Math.floor(Math.random() * rarities.length)];

    const fullID = getFullCardID(randCard.id, randRarity);

    const thumbnailFile = `File:Img${fullID}.png`;
    const iconURL = await Wiki.getImageURL(thumbnailFile);
    if (!iconURL) {
      this.message.channel.send(`Error: There was a problem fetching the card icon for ${name}`);
      return;
    }

    const icon = await loadImage(iconURL);
    return icon;
  }

  public async getBuffer(): Promise<Buffer | undefined> {
    const template = await loadImage(path.resolve(__dirname, '../images/ten_roll_template.jpg'));
    const NEW = await loadImage(path.resolve(__dirname, '../images/new.png'));
    const icons: Image[] = [];
    let error = 0;
    while (icons.length < 10) {
      const icon = await this.getRandomIcon();
      if (!icon) {
        error++;
      } else {
        icons.push(icon);
      }
      if (error >= 10) return;
    }

    const canvas = createCanvas(600, 570);
    const ctx = canvas.getContext('2d');

    // Draw the roll template onto the canvas
    ctx.drawImage(template, 0, 0);

    for (let i = 0; i < 5; i++) {
      ctx.drawImage(icons[i], 30 + 111 * i, 153);
      if (Math.floor(Math.random() * 4) === 0) {
        ctx.drawImage(NEW, 23 + 111 * i, 125);
      }
    }

    for (let i = 5; i < 10; i++) {
      ctx.drawImage(icons[i], 30 + 111 * (i - 5), 273);
      if (Math.floor(Math.random() * 4) === 0) {
        ctx.drawImage(NEW, 23 + 111 * (i - 5), 245);
      }
    }

    // GASE
    ctx.font = '30px Ubuntu';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('©GASE', 470, 550);

    // Get Data URL?
    const buffer = canvas.toBuffer();
    return buffer;
  }
}

export { TenRoll };
