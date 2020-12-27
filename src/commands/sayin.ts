import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['sayin <channel-tag> <message>'],
  description: 'Look up a card on the Puyo Nexus Wiki',
  args: true,
  aliases: [],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Only moderators can use this command
    // if (!message.member?.hasPermission('ADMINISTRATOR')) {
    if (!message.member?.hasPermission('BAN_MEMBERS')) {
      return;
    }

    if (args.length < 2) return;

    const channelID = args[0].slice(2, args[0].length - 1);
    const channel = (await message.client.channels.fetch(channelID)) as Discord.TextChannel;
    const msg = args.slice(1).join(' ');

    channel.send(msg);
  },
};

export default command;
