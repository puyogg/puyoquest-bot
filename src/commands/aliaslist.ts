import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { getNameFromAlias, getAliasesFromName } from '../helper/match-alias';
import { normalizeTitle } from '../wiki/parser';
import { Wiki } from '../wiki/api';

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name, // alias-delete
  usage: ['alias-list <alias or name>'],
  description: 'Remove a character alias.',
  args: true,
  aliases: ['al'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    const msg = message.content.trim();
    if (msg.indexOf(' ') === -1) {
      message.channel.send(`Error: You didn't give a name to check.`);
      return;
    }
    // Clean multiple spaces
    msg.replace(/\s\s+/g, ' ');

    const arg = msg.slice(msg.indexOf(' ') + 1).toLowerCase();

    // The arg could be the alias or the actual name.
    let name = (await getNameFromAlias(arg)) || normalizeTitle(arg);

    // Check if the name is valid (capable of looking up a character)
    const redirectName = await Wiki.checkCharRedirect(name);
    if (!redirectName) {
      message.channel.send(`Error: ${name} is not a valid alias or character.`);
      return;
    }

    name = redirectName;

    const aliases = await getAliasesFromName(name);
    if (!aliases || aliases.length === 0) {
      message.channel.send(`${name} doesn't have any aliases.`);
      return;
    }
    message.channel.send(`${name} has these aliases: \`\`\`${aliases.join(', ')}\`\`\``);
    return;
  },
} as Command;
