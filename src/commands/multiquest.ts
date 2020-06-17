import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { textToMilliseconds } from '../helper/duration-parser';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['multiquest <RoomCode> [Room Name] ([Duration])'],
  description: 'Send a link to your multiplayer quest room.',
  args: true,
  aliases: ['mq'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    if (args.length < 1) {
      message.channel.send(`Error: You didn't supply a room code.`);
      return;
    }

    const roomCode = args[0];
    if (!/^[0-9]{6}$/.test(roomCode)) {
      message.channel.send(`Error: ${roomCode} isn't a valid room code.`);
      return;
    }

    // Check in the last arg for text that's sandwiched by parentheses
    const durationText = /^\((.+)\)$/.test(args[args.length - 1]) && args[args.length - 1].replace(/\(|\)/g, '');
    const roomName = durationText ? args.slice(1, args.length - 1).join(' ') : args.slice(1).join(' ');

    // Parse the durationText into milliseconds.
    let duration = 300000; // Default: 5 minutes
    if (durationText) {
      const ms = textToMilliseconds(durationText);
      duration = ms ? ms : duration;
    }

    const em = new Discord.MessageEmbed()
      .setTitle('A Multiplayer Quest room has oppened!')
      .addFields(
        {
          name: 'Room Name',
          value: roomName,
          inline: false,
        },
        {
          name: 'Room Code',
          value: roomCode,
          inline: true,
        },
        {
          name: 'Status',
          value: `👐 Recruiting! ${durationText}`,
          inline: true,
        },
        {
          name: 'TAPI Link',
          value: `https://tapi.puyoquest.jp/multi/redirect/?room_no=${roomCode}`,
          inline: false,
        },
      )
      .setFooter(`Room opened by: ${message.member?.displayName}`);

    const msg = await message.channel.send(em);
    setTimeout(() => {
      const em = new Discord.MessageEmbed()
        .setTitle('⛔ The Multiplayer Quest room has closed.')
        .addFields(
          {
            name: 'Room Name',
            value: roomName,
            inline: false,
          },
          {
            name: 'Room Code',
            value: roomCode,
            inline: true,
          },
          {
            name: 'Status',
            value: `⛔ Closed.`,
            inline: true,
          },
          {
            name: 'TAPI Link',
            value: `https://tapi.puyoquest.jp/multi/redirect/?room_no=${roomCode}`,
            inline: false,
          },
        )
        .setFooter(`Room opened by: ${message.member?.displayName}`);
      msg.edit(em);
    }, duration);
  },
};

export default command;
