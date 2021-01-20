import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { loadImage, Image, createCanvas, Canvas } from 'canvas';
import { Card } from '../wiki/parser';

// Retrieve command name from filename
const name = path.parse(__filename).name;

// Load assets
let fieldBorder: Image;
loadImage(path.resolve(__dirname, '../images/sim/field_template.png'))
  .then((image) => (fieldBorder = image))
  .catch(() => console.error(`There was a problem loading the field border.`));
let fieldBG: Image;
loadImage(path.resolve(__dirname, '../images/sim/field_son.png'))
  .then((image) => (fieldBG = image))
  .catch(() => console.error(`There was a proble loading the field background.`));

export default {
  name: name, // iq
  usage: ['?pp'],
  description: 'Pretend the PPQ characters are saying stupid things.',
  args: true,
  aliases: ['pp'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    const canvas = createCanvas(900, 870);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(fieldBG, 0, 0, 400, 724, 74, 89, 400, 724);
    ctx.drawImage(fieldBorder, 0, 0);
    // Get PNG buffer
    const buffer = canvas.toBuffer('image/png');
    message.channel.send({
      files: [buffer],
    });
    return;
  },
} as Command;
