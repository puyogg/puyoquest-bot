import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const SPECIAL_CHANNELS = ['quest-channel', 'event-channel'];

const command: Command = {
  name: name, // admin
  usage: ['admin <set-channel|rm-channel> <quest-channel|event-channel>'],
  description: 'Set or change bot settings.',
  args: false,
  aliases: [],
  category: ['administration'],
  execute(message: Discord.Message, args: string[]): void {
    // Check if the user has permission to use admin commands
    if (!message.member?.hasPermission('MANAGE_GUILD')) {
      message.channel.send(`Error: You don't have permission to use this command.`);
      return;
    }

    // Check number of arguments
    if (args.length === 0) {
      message.channel.send(`Error: Insufficient parameters. See \`!help admin.\``);
      return;
    }

    // Check if subcommand exists
    if (!this.subCommands?.has(args[0])) {
      message.channel.send(`Error: The requested subcommand ${args[0]} doesn't exist. See \`!help admin\``);
      return;
    }

    // Call subcommand
    this.subCommands?.get(args[0])?.execute(message, args.slice(1));
  },
};

export { SPECIAL_CHANNELS };
export default command;
