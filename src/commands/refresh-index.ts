import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name,
  usage: ['refresh-index'],
  description: 'Refresh the card index.',
  args: true,
  aliases: ['ri'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Only allow aliasing on EPPC, unless we're in dev mode
    if (message.guild?.id !== '133012933260214272' && process.env.NODE_ENV === 'production') {
      message.channel.send('Error: Currently, this command is only designed to be used in the EPPC Discord.');
      return;
    }

    const isWikiEditor =
      message.member?.roles.cache.find((r) => r.id === '626074297772802048' && r.guild.id === '133012933260214272') !==
      undefined;

    if (!(message.channel.id === '188877926786269184' && isWikiEditor)) {
      message.channel.send(
        'Error: Currently, this command can only be used in the #puyoquest channel by Wiki Editors.',
      );
      return;
    }

    await message.channel.send('Refreshing card index...');
    await Wiki.buildCardIndex();
    await message.channel.send('Finished refreshing card index.');
  },
} as Command;
