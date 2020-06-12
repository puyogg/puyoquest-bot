import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { db } from '../db';

const name = path.parse(__filename).name;

export default {
  name: name, // ntc
  usage: ['ntc-leaderboard'],
  description: 'Get the leaderboard',
  args: true,
  aliases: ['ntcl'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    const guild = message.guild;
    if (!guild) return;
    const rows = await db
      .any(
        `SELECT user_id, correct
      FROM ntc_leaderboard
      WHERE server_id = $1
      ORDER BY correct DESC
      LIMIT 10`,
        [guild.id],
      )
      .catch((e) => console.error(e));

    if (!rows) {
      message.channel.send(`Error: There was a problem fetching the leaderboard from the database.`);
      return;
    }

    const leaders = rows.map((row) => {
      const userID: string = row['user_id'];
      const correct: number = row['correct'];
      const user = guild.member(userID);
      let userName = '?';
      if (user) userName = user.nickname || '?';
      return {
        userName: userName,
        correct: correct,
      };
    });

    let msg = '';
    leaders.forEach((leader, i) => {
      msg += `${i + 1}. ${leader.userName}: ${leader.correct}\n`;
    });

    const em = new Discord.MessageEmbed().setTitle('NTC Leaderboard').setTimestamp().setDescription(msg);
    message.channel.send(em);
  },
} as Command;
