import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { db } from '../db';

interface LeaderboardData {
  user_id: string;
  placement: string;
  correct: number;
}

interface LeaderboardObj extends LeaderboardData {
  userName: string;
}

const name = path.parse(__filename).name;

export default {
  name: name, // ntc
  usage: ['ntc-leaderboard'],
  description: 'Get the leaderboard',
  args: true,
  aliases: ['ntcl'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Null checking for typescript
    const guild = message.guild;
    if (!guild) return;

    // Check if the user wants to get the leaderboard centered around themselves.
    const wantSelf = args[0] === 'me';

    let msg = '';
    let rows: LeaderboardData[] | undefined;
    const leaders: LeaderboardObj[] = [];

    if (wantSelf) {
      // Get the user's current placement
      const userPlacement = await db
        .one(
          `
        WITH rankings AS (
            SELECT user_id, server_id, correct, ROW_NUMBER() OVER ( ORDER BY correct DESC ) placement
            FROM ntc_leaderboard
            WHERE server_id = $2
        ), place AS (
            SELECT placement
            FROM rankings
            WHERE user_id = $1 AND server_id = $2
        )
        SELECT placement
        FROM rankings 
        WHERE placement =
            (SELECT placement FROM place);
        `,
          [message.author.id, guild.id],
        )
        .then((d) => parseInt(d['placement'], 10))
        .catch(() => undefined);

      // Get the max number of rows in the table
      const numRows = await db
        .one(
          `
          SELECT COUNT(*)
          FROM ntc_leaderboard
          WHERE server_id = $1
          `,
          [guild.id],
        )
        .then((d) => parseInt(d['count'], 10))
        .catch(() => undefined);

      if (!userPlacement) {
        message.channel.send(`Error: You aren't on the leaderboard.`);
        return;
      }

      if (!numRows) {
        message.channel.send(`Error: There was a problem reading the rows in the database.`);
        return;
      }

      // PostgreSQL ranking is 1-indexed
      // Get start and end positions around the user,
      // and expand if they're near the very top or very bottom of the rankings.
      let start = userPlacement - 5 > 0 ? userPlacement - 5 : 0;
      let end = userPlacement + 4 < numRows ? userPlacement + 4 : numRows;
      if (end - userPlacement < 4) {
        start -= 4 - (end - userPlacement);
      }

      if (userPlacement - start < 5) {
        end += 5 - (userPlacement - start);
      }

      console.log('Start End', start, end);

      // rows is from outside this scope
      rows = await db
        .many(
          `
        WITH rankings AS (
            SELECT user_id, server_id, correct, ROW_NUMBER() OVER ( ORDER BY correct DESC ) placement
            FROM ntc_leaderboard
            WHERE server_id = $3
        )
        SELECT user_id, correct, placement
        FROM rankings 
        WHERE placement >= $1 AND placement <= $2; 
        `,
          [start, end, guild.id],
        )
        .then((data) => data as LeaderboardData[])
        .catch(() => undefined);
    } else {
      rows = await db
        .any(
          `WITH rankings AS (
            SELECT user_id, correct, ROW_NUMBER() OVER ( ORDER BY correct DESC ) placement
            FROM ntc_leaderboard
            WHERE server_id = $1
            LIMIT 10
        )
        SELECT user_id, correct, placement
        FROM rankings`,
          [guild.id],
        )
        .then((d) => d as LeaderboardData[])
        .catch(() => undefined);
    }

    if (!rows) {
      message.channel.send(`Error: There was a problem fetching the leaderboard from the database.`);
      return;
    }

    // Get username from Discord ID
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const member = await guild.members.fetch(row['user_id']);
      const userName = member?.displayName || member?.nickname || member?.user.username || '?';

      const obj: LeaderboardObj = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        user_id: row.user_id,
        placement: row.placement,
        correct: row.correct,
        userName: userName,
      };

      leaders.push(obj);
    }

    leaders.forEach((leader) => {
      if (leader.user_id === message.author.id) {
        msg += `__**${leader.placement}. ${leader.userName}: ${leader.correct}**__\n`;
      } else {
        msg += `${leader.placement}. ${leader.userName}: ${leader.correct}\n`;
      }
    });

    const em = new Discord.MessageEmbed().setTitle('NTC Leaderboard').setTimestamp().setDescription(msg);
    message.channel.send(em);
  },
} as Command;

export { LeaderboardData, LeaderboardObj };
