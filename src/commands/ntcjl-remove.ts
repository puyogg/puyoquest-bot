import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { db } from '../db';

export default {
  name: path.parse(__filename).name, // ntc-remove
  usage: ['?ntcjl-remove'],
  description: 'Remove a user from the Japanese ntc leaderboard.',
  args: true,
  aliases: [],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      message.reply(`Error: You didn't specify a user to remove.`);
      return;
    }

    // Get the target user.
    const targetUser = await message.guild?.members.fetch(args[0].replace(/\D+/g, ''));
    if (!targetUser) {
      message.reply(`Error: Couldn't find the specified user.`);
      return;
    }

    // Only admins or the users themselves can remove a user.
    if (!message.member?.hasPermission('BAN_MEMBERS') && targetUser.id !== message.author.id) {
      message.reply(`Error: You don't have permission to remove other users from the leaderboard.`);
      return;
    } else if (message.member?.hasPermission('BAN_MEMBERS') || targetUser.id === message.author.id) {
      db.none(
        `
        DELETE FROM ntcj_leaderboard
        WHERE user_id = $1 AND server_id = $2;
      `,
        [targetUser.id, message.guild?.id],
      )
        .then(() => {
          message.reply(
            `Successfully removed ${
              targetUser.displayName || targetUser.nickname || 'the user'
            } from the ntcj leaderboard.`,
          );
        })
        .catch(() => {
          message.reply(`Error: There was a problem removing you from the leaderboard.`);
        });
    }
  },
} as Command;
