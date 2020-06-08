import * as path from 'path';
import { Command } from '../../command-info';
import * as Discord from 'discord.js';
import { db } from '../../db';

// Retrieve command name from filename
const name = path.parse(__filename).name;
import { SPECIAL_CHANNELS } from '../admin';

const command: Command = {
  name: name, // set-channel
  usage: ['!admin set-channel <mod-logs|mod-alerts|league-logs|league-updates>'],
  description: 'Admin command to set special channels',
  args: false,
  aliases: [],
  category: ['administration'],
  execute(message: Discord.Message, args: string[]): void {
    // Check if enough arguments were supplied
    if (args.length < 2) {
      message.channel.send('Error: Insufficient parameters. See `!help admin set`.');
      return;
    }

    // Validate the requested special channel to be set
    const requestedChannel = args[0];
    if (!SPECIAL_CHANNELS.includes(requestedChannel)) {
      message.channel.send(
        `Error: ${requestedChannel} is not a valid special channel type. Choose from ${SPECIAL_CHANNELS.join(', ')}`,
      );
      return;
    }

    // Check if the guild actually has a channel with the given ID.
    const channelID = args[1].slice(2, args[1].length - 1);
    if (!message.client.channels.resolve(channelID)) {
      message.channel.send(`Error: Failed to set ${requestedChannel}. You didn't supply a valid channel.`);
      return;
    }

    // Send INSERT query to SQL Database.
    const dbCol = requestedChannel.replace('-', '_'); // DB uses _ instead of -

    db.none(
      `INSERT INTO special_channels (server_id, $[dbCol~])
      VALUES ($[guildID], $[channelID])
      ON CONFLICT (server_id)
      DO UPDATE SET $[dbCol~] = $[channelID];
      `,
      {
        dbCol: dbCol,
        guildID: message.guild?.id,
        channelID: channelID,
      },
    )
      .then(() => {
        message.channel.send(`Successfully set the ${requestedChannel} channel to <#${channelID}>`);
        return;
      })
      .catch((error) => {
        console.error('ERROR: ', error);
      });

    // !! May need to set another updating function that modifies the client.
  },
};

export default command;
