import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { loadImage, Image, createCanvas, Canvas } from 'canvas';
import { Card } from '../wiki/parser';
import { drawGame } from '../helper/sim/draw';

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

interface VoteDict {
  [index: string]: number;
}

export default {
  name: name, // iq
  usage: ['?pp'],
  description: 'Pretend the PPQ characters are saying stupid things.',
  args: true,
  aliases: ['pp'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // const canvas = createCanvas(900, 870);
    // const ctx = canvas.getContext('2d');

    // ctx.drawImage(fieldBG, 0, 0, 400, 724, 74, 89, 400, 724);
    // ctx.drawImage(fieldBorder, 0, 0);
    console.log(args);
    const canvas = drawGame({
      // fieldString: '311502444423226552233623366523223463434622223462423465435645423564235645235645',
      fieldString: args.length > 0 ? args[0] : new Array(6 * 13).fill(0).join(''),
    });
    // Get PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // Send the message, and get a reference to the successfully sent message
    const msg = await message.channel.send({
      files: [buffer],
    });

    const actions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '🔄', '🔁'];

    const filter = (reaction: Discord.MessageReaction, user: Discord.User): boolean => {
      return actions.includes(reaction.emoji.name);
    };

    // Set up reaction awaiter
    msg
      .awaitReactions(filter, { time: 60000, errors: ['time'] })
      .catch((collected: Discord.Collection<string, Discord.MessageReaction>) => {
        const columnVotes: VoteDict = {
          '1️⃣': collected.get('1️⃣')?.count || 0,
          '2️⃣': collected.get('2️⃣')?.count || 0,
          '3️⃣': collected.get('3️⃣')?.count || 0,
          '4️⃣': collected.get('4️⃣')?.count || 0,
          '5️⃣': collected.get('5️⃣')?.count || 0,
          '6️⃣': collected.get('6️⃣')?.count || 0,
        };
        const rotationVotes: VoteDict = {
          '🔄': (collected.get('🔄')?.count || 1) - 1,
          '🔁': (collected.get('🔁')?.count || 1) - 1,
        };

        const chosenColumn = Object.keys(columnVotes).reduce((prev, curr) =>
          columnVotes[prev] > columnVotes[curr] ? prev : curr,
        );
        let rotation = 0;
        for (let i = 0; i < rotationVotes['🔁']; i++) {
          rotation = (rotation + 1) % 4;
        }
        for (let i = 0; i < rotationVotes['🔄']; i++) {
          rotation = (rotation + 4 - 1) % 4;
        }
        message.channel.send(
          `${Object.keys(columnVotes)}\n${Object.values(columnVotes)}\n${Object.values(
            rotationVotes,
          )}\nChosen column: ${chosenColumn}\nChosen rotation: ${rotation}`,
        );
      });

    // Add reactions to message
    for (const action of actions) {
      await msg.react(action).catch();
    }

    return;
  },
} as Command;
