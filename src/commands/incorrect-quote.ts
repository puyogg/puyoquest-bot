import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { loadImage, Image, createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import { Card } from '../wiki/parser';

// Load outside the command to keep it cached.
let bubble: Image;
loadImage(path.resolve(__dirname, '../images/bubble.png'))
  .then((image) => (bubble = image))
  .catch(() => console.error('There was a problem loading the bubble image.'));

let bubbleLeft: Image;
loadImage(path.resolve(__dirname, '../images/bubble_left.png'))
  .then((image) => (bubbleLeft = image))
  .catch(() => console.error('There was a problem loading the bubble image.'));

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name, // iq
  usage: ['?iq [name #]'],
  description: 'Pretend the PPQ characters are saying stupid things.',
  args: true,
  aliases: ['iq'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Check if bubble template is loaded;
    if (!bubble) return;

    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

    if (args.length === 0) {
      message.reply(`Error: You didn't provide a card or a message.`);
      return;
    }

    const matches = message.content.match(/\[(.*?)]/g);
    if (!matches) {
      message.channel.send(
        `Error: You didn't provide a card name in the proper format. Type a spaced list of card names as [Name Rarity] or [Name]`,
      );
      return;
    }

    const cardReqs = matches.map((match) => match.replace(/\[|\]/g, ''));

    if (cardReqs.length > 8) {
      message.reply(`Error: You requested more than 8 cards.`);
      return;
    }

    // Single character
    if (cardReqs.length == 1) {
      const card = await Wiki.getCard(cardReqs[0]);

      if (!card) {
        message.reply(`Invalid request: ${cardReqs[0]}`);
        return;
      }

      // Download full art
      const faURL = await Wiki.getImageURL(`File:Img${card.code}_l.png`);
      if (!faURL) {
        message.reply(`Couldn't find full art for ${cardReqs[0]}`);
        return;
      }
      const faImg = await loadImage(faURL);

      const canvas = createCanvas(960, 540);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(faImg, 0, 540 - faImg.height, faImg.width, faImg.height);
      ctx.drawImage(bubble, 240, 40, bubble.width, bubble.height);

      // Write text
      const memeText = message.content.split(']')[1].trim();
      // console.log(memeText);
      ctx.font = '32px Ubuntu';
      ctx.fillStyle = '#1360be';
      // ctx.fillText(memeText, 280, 120);

      const words = memeText.split(' ');
      let line = '';
      let fullMessage = '';
      const x = 300;
      const y = 150;
      // const lineHeight = 35;
      let rows = 1;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > 580 && n > 0) {
          // ctx.fillText(line, x, y);
          fullMessage = fullMessage === '' ? fullMessage + line : fullMessage + '\n' + line;
          line = words[n] + ' ';
          // y += lineHeight;
          rows += 1;
        } else {
          line = testLine;
        }
      }
      fullMessage = fullMessage === '' ? fullMessage + line : fullMessage + '\n' + line;
      ctx.fillText(fullMessage, x, y - (rows - 1) * 20);

      // console.log(ctx.measureText(fullMessage));

      const buffer = canvas.toBuffer();
      message.reply({
        files: [buffer],
      });
    } else if (cardReqs.length > 1) {
      const data: Card[] = [];
      for (let i = 0; i < cardReqs.length; i++) {
        const card = await Wiki.getCard(cardReqs[i]);
        if (card) {
          data.push(card);
        } else {
          message.channel.send(`Error: Couldn't parse [${cardReqs[i]}]`);
        }
      }

      const validData = data.filter((d) => !!d);

      if (validData.length === 0) {
        message.reply(`Error: No cards were found.`);
        return;
      }

      // Download card icons
      const icons: Image[] = [];
      for (let i = 0; i < validData.length; i++) {
        const card = validData[i];
        if (!card) continue;
        const iconURL = await Wiki.getImageURL(`File:Img${card.code}.png`);
        if (!iconURL) continue;
        const icon = await loadImage(iconURL);
        icons.push(icon);
      }

      // Get text to say
      const speeches = message.content
        .replace(/\[(.*?)]/g, ']')
        .split(']')
        .filter((str) => str.length > 0)
        .map((str) => str.trim())
        .slice(1);

      if (speeches.length !== icons.length) {
        message.reply(`Error: You didn't supply messages for each character.`);
        return;
      }

      // Create canvases
      const canvases: Canvas[] = [];

      for (let i = 0; i < icons.length; i++) {
        const canvas = createCanvas(740, 120);
        const ctx = canvas.getContext('2d');

        // Draw card icon
        ctx.drawImage(icons[i], 5, 5, 110, 110);
        // Draw bubble
        ctx.drawImage(bubbleLeft, 120, 0);

        // Write text
        const memeText = speeches[i].trim();
        ctx.font = '26px Ubuntu';
        ctx.fillStyle = '#1360be';

        const words = memeText.split(' ');
        let line = '';
        let fullMessage = '';
        const x = 180;
        const y = 64;
        let rows = 1;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > 500 && n > 0) {
            fullMessage = fullMessage === '' ? fullMessage + line : fullMessage + '\n' + line;
            line = words[n] + ' ';
            rows += 1;
          } else {
            line = testLine;
          }
        }
        fullMessage = fullMessage === '' ? fullMessage + line : fullMessage + '\n' + line;
        ctx.fillText(fullMessage, x, y - (rows - 1) * 12);

        canvases.push(canvas);
      }

      // Draw onto final canvas
      const canvas = createCanvas(740, 120 * icons.length);
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < canvases.length; i++) {
        ctx.drawImage(canvases[i], 0, 120 * i);
      }

      const buffer = canvas.toBuffer();
      message.reply({
        files: [buffer],
      });
    }
  },
} as Command;
