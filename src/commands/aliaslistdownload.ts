import * as path from 'path';
import * as fs from 'fs';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // alias-delete
  usage: ['aliaslistdownload'],
  description: 'Remove a character alias.',
  args: true,
  aliases: [],
  category: ['puyoquest'],
  cooldown: 300,
  async execute(message: Discord.Message): Promise<void> {
    // Only allow aliasing on EPPC
    if (message.guild?.id !== '133012933260214272') {
      message.channel.send('Error: This command can only be used on the EPPC Discord server.');
      return;
    }

    if (!message.member?.hasPermission('MANAGE_MESSAGES')) {
      message.channel.send('Error: Only moderators can use this command.');
      return;
    }

    const groupedAliases = await Wiki.listAllAliases();
    const json = JSON.stringify(groupedAliases, null, 2);
    fs.writeFileSync('./aliaslist.json', json);
    message.channel
      .send({
        files: [
          {
            attachment: path.resolve('./aliaslist.json'),
            name: 'aliaslist.json',
          },
        ],
      })
      .catch(console.error);
  },
};

export default command;
