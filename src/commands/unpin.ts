import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name,
  usage: ['unpin messagelink'],
  description: 'Pin a message in #puyopuyoquest.',
  args: true,
  aliases: [],
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

    // Check if an argument was given
    if (args.length === 0) {
      message.channel.send(`Error: You didn't specify a message to unpin.`);
      return;
    }

    // Detect whether args[0] is a message link or a message ID
    let messageID = args[0];
    if (messageID.includes('/')) {
      const split = messageID.split('/');
      messageID = split[split.length - 1];
    }

    // Fetch the message
    try {
      const targetMsg = await message.channel.messages.fetch(messageID);
      targetMsg
        .unpin()
        .then(() => message.channel.send('Successfully unpinned your requested message.'))
        .catch(() => message.channel.send('Error: There was a problem trying to unpin your message.'));
    } catch {
      message.channel.send(`Error: There was a problem finding the message you want to unpin.`);
      return;
    }
  },
} as Command;
