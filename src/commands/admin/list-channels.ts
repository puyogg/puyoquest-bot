import * as path from 'path';
import { Command } from '../../command-info';
import * as Discord from 'discord.js';
import { db } from '../../db';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // list-channels
  usage: ['!admin list-channels'],
  description: 'List the bindings for each of the special channels',
  args: false,
  aliases: [],
  category: ['administration'],
  async execute(message: Discord.Message): Promise<void> {
    try {
      const data = await db.one(`SELECT * FROM special_channels WHERE server_id = $1`, [message.guild?.id]);

      const em = new Discord.MessageEmbed()
        .setTitle('Channel Settings')
        .addFields(
          { name: 'Puyo Quest Main Channel', value: `<#${data['quest_channel']}>` },
          { name: 'Puyo Quest Event Channel', value: `<#${data['event_channel']}>` },
        );

      message.channel.send(em);
    } catch (e) {
      console.error(e);
    }
  },
};

export default command;
