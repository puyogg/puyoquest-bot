import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki } from '../wiki/api';
import { loadImage, Image, createCanvas, Canvas } from 'canvas';

let bubble: Image;
loadImage(path.resolve(__dirname, '../images/bubble.png'))
  .then((image) => (bubble = image))
  .catch(() => console.error('There was a problem loading the bubble image.'));

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['sir'],
  description: 'Ask a demon for advice.',
  args: true,
  aliases: ['shouldiroll', 'sir'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

    const int = Math.floor(Math.random() * 100);

    const randCard = Wiki.getRandomCard();
    if (randCard) {
      const card = await Wiki.getCard((randCard.normalizedName || randCard.name) as string);

      if (!card) {
        message.reply(`idk`);
        return;
      }

      // Download full art
      const faURL = await Wiki.getImageURL(`File:Img${card.code}_l.png`);
      if (!faURL) {
        message.reply(`idk`);
        return;
      }
      const faImg = await loadImage(faURL);

      const canvas = createCanvas(960, 540);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(faImg, 0, 540 - faImg.height, faImg.width, faImg.height);
      ctx.drawImage(bubble, 240, 40, bubble.width, bubble.height);

      // Write text
      let memeText = 'Hell no.';
      ctx.font = '32px Ubuntu';
      ctx.fillStyle = '#1360be';
      const x = 300;
      const y = 150;
      let lineHeight = 20;
      let rows = 1;
      if (int < 10) {
        memeText = 'You will live the rest of your life with regrets.';
      } else if (int < 20) {
        memeText = `Don't ask me questions if you aren't prepared for the consequences.`;
      } else if (int < 25) {
        memeText = 'Hahahaha nice joke.';
      } else if (int < 30) {
        memeText = `I suppose there's a place for you in hell, too.`;
      } else if (int < 35) {
        memeText = `Well, did you brush your teeth this morning?`;
      } else if (int < 40) {
        memeText = `Clearly, you would die first in a zombie apocalypse.`;
      } else if (int < 45) {
        memeText = `That's stupid. You're stupid.`;
      } else if (int < 50) {
        memeText = `You should think before you speak next time.`;
      } else if (int < 55) {
        memeText = `I think you should ask that question to your friends. If you have any.`;
      } else if (int < 60) {
        memeText = 'You are responsible for your own pain and suffering.';
      } else if (int < 65) {
        memeText = `Maybe you're the mistake.`;
      } else if (int < 70) {
        memeText = `Are you prepared to eat cup ramen for the next 24 years?`;
      } else if (int < 90) {
        memeText = 'Hell no.';
      } else if (int < 100) {
        ctx.font = '28px Ubuntu';
        lineHeight = 14;
        memeText = `Hello! The name's ${card.name}!! I'm hitting the books hard to become a wonderful magic user. But today isn't the day for studies because you're being a bi`;
      }

      const words = memeText.split(' ');
      let line = '';
      let fullMessage = '';
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
      ctx.fillText(fullMessage, x, y - (rows - 1) * lineHeight);

      // console.log(ctx.measureText(fullMessage));

      const buffer = canvas.toBuffer();
      message.reply({
        files: [buffer],
      });
      return;
    }

    message.reply('Hell no.');
    return;
  },
};

export default command;
