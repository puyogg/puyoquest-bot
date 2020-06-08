import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // admin
  usage: ['page <PPQ Link>'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['p'],
  category: ['puyoquest'],
  execute(message: Discord.Message, args: string[]): void {
    const pageTitle = args.join('_');

    if (pageTitle.length === 0) {
      message.channel.send('https://puyonexus.com/wiki/PPQ:Portal');
      return;
    } else if (pageTitle.includes(':')) {
      message.channel.send(`https://puyonexus.com/wiki/${pageTitle}`);
      return;
    } else {
      message.channel.send(`https://puyonexus.com/wiki/PPQ:${pageTitle}`);
      return;
    }
  },
};

export default command;
