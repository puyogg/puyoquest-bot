import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { getAliasDataForAlias } from '../helper/match-alias';
import { db } from '../db';

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name, // alias-delete
  usage: ['alias-delete <alias>'],
  description: 'Remove a character alias.',
  args: true,
  aliases: ['ad'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    // Only allow aliasing on EPPC
    if (message.guild?.id !== '133012933260214272') {
      message.channel.send('Error: Alias management is only allowed on the EPPC Discord server.');
      return;
    }

    const msg = message.content.trim();
    if (msg.indexOf(' ') === -1) {
      message.channel.send(`Error: You didn't give an alias to delete.`);
      return;
    }
    // Clean multiple spaces
    msg.replace(/\s\s+/g, ' ');

    const alias = msg.slice(msg.indexOf(' ') + 1).toLowerCase();
    // console.log('inputted alias', alias);

    // Check if the alias is in the database
    const aliasData = await getAliasDataForAlias(alias);
    // console.log('alias data', aliasData);
    if (!aliasData) {
      message.channel.send(`Error: The alias ${alias} isn't set to any characters.`);
      return;
    }

    db.none(`DELETE FROM aliases WHERE nick_name = $1`, [alias])
      .then(() => {
        message.channel.send(`Successfully removed the alias "${alias}" from character: ${aliasData['full_name']}`);
        return;
      })
      .catch(() => {
        message.channel.send(
          `Error: There was a problem removing the alias "${alias}" from character: ${aliasData['full_name']}`,
        );
      });
  },
} as Command;
