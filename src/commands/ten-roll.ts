import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { TenRoll } from '../helper/ten-roll';
import { Wiki } from '../wiki/api';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['tenroll'],
  description: 'Fight your gambling addiction.',
  args: true,
  aliases: ['tenroll', 'seek-my-own-destruction'],
  category: ['puyoquest'],
  cooldown: 60,
  async execute(message: Discord.Message): Promise<void> {
    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

    const buffer = await new TenRoll(message).getBuffer();
    message.reply({
      files: [buffer],
    });
  },
};

export default command;
