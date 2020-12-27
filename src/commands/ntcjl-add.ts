import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { db } from '../db';

export default {
  name: path.parse(__filename).name, // ntc-remove
  usage: ['?ntcjl-add @user score'],
  description: 'Add or update a user to the ntc leaderboard with a certain score.',
  args: true,
  aliases: [],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    if (args.length < 1) {
      message.reply(`Error: You didn't specify a user to add.`);
      return;
    }

    if (args.length < 2) {
      message.reply(`Error: You didn't supply a default score for the user.`);
      return;
    }

    // Get the target user.
    const targetUser = await message.guild?.members.fetch(args[0].replace(/\D+/g, ''));
    if (!targetUser) {
      message.reply(`Error: Couldn't find the specified user.`);
      return;
    }

    // Set the default score
    const score = parseInt(args[1], 10);
    if (isNaN(score)) {
      message.reply(`Error: You entered an invalid value for the user's score.`);
      return;
    }

    console.log('Score...', score);

    if (!message.member?.hasPermission('BAN_MEMBERS')) {
      message.reply(`Error: You don't have permission to add users to the leaderboard.`);
      return;
    }

    db.none(
      `INSERT INTO ntcj_leaderboard (user_id, server_id, correct)
        VALUES ($[userID], $[serverID], $[score])
        ON CONFLICT (user_id, server_id)
        DO UPDATE SET correct = $[score] WHERE ntcj_leaderboard.user_id = $[userID]`,
      {
        userID: targetUser.id,
        serverID: message.guild?.id,
        score: score,
      },
    )
      .then(() => {
        message.reply(
          `Successfully added ${targetUser.displayName || targetUser.nickname || 'the user'} with score ${score}`,
        );
      })
      .catch(() => {
        message.reply(`Error: There was a problem adding a user to the database.`);
      });
  },
} as Command;
