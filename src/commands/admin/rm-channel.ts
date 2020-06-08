import * as path from 'path';
import { Command } from '../../command-info';
import * as Discord from 'discord.js';
import { db } from '../../db';

// Retrieve command name from filename
const name = path.parse(__filename).name;
import { SPECIAL_CHANNELS } from '../admin';

const command: Command = {
  name: name, // rm-channel
  usage: ['!admin rm-channel <mod-logs|mod-alerts|league-logs|league-updates>'],
  description: 'Admin command to remove special channels, disabling them.',
  args: false,
  aliases: [],
  category: ['administration'],
  execute(message: Discord.Message, args: string[]): void {
    // Check if enough arguments were supplied
    if (args.length === 0) {
      message.channel.send('Error: Insufficient parameters. See `!help admin set`.');
      return;
    }

    // Validate the requested special channel to be removed
    const requestedChannel = args[0];
    if (!SPECIAL_CHANNELS.includes(requestedChannel)) {
      message.channel.send(
        `Error: ${requestedChannel} is not a valid special channel type. Choose from ${SPECIAL_CHANNELS.join(', ')}`,
      );
      return;
    }

    // Send UPDATE query to SQL Database.
    const dbCol = requestedChannel.replace('-', '_'); // DB uses _ instead of -
    db.none(
      `
      UPDATE special_channels
      SET $[dbCol~] = NULL
      WHERE server_id = $[guildID];
      `,
      {
        dbCol: dbCol,
        guildID: message.guild?.id,
      },
    )
      .then(() => {
        message.channel.send(`Successfully removed the ${requestedChannel} channel.`);
        return;
      })
      .catch((error) => {
        console.error('ERROR: ', error);
      });
  },
};

export default command;
