import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { textToMilliseconds } from '../helper/duration-parser';
import { Wiki } from '../wiki/api';
import { colorHex } from '../helper/embed-color';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['questbattle <RoomCode> [Room Name] ([Duration])'],
  description: 'Send a link to your multiplayer quest room.',
  args: true,
  aliases: ['qb'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

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
    let durationText = /^\((.+)\)$/.test(args[args.length - 1]) && args[args.length - 1].replace(/\(|\)/g, '');
    const roomName = durationText ? args.slice(1, args.length - 1).join(' ') : args.slice(1).join(' ');
    if (!durationText) durationText = '5m'; // Default: 5 minutes

    // Parse the durationText into milliseconds.
    let duration = 300000; // Default: 5 minutes
    if (durationText) {
      const ms = textToMilliseconds(durationText);
      duration = ms ? ms : duration;
    }

    // Get card thumbnail matching a character name in roomName
    const character = Wiki.cardIndex.find(
      (data) => data.normalizedName && roomName.toLowerCase().includes(data.normalizedName),
    );

    const imgURL = character && (await Wiki.getImageURL(`File:Img${character.rarestid}.png`));

    const em = new Discord.MessageEmbed()
      .setTitle(`You are being challenged by ${message.member?.displayName}!`)
      .addFields(
        {
          name: 'Room Name',
          value: roomName || 'N/A',
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
          value: `https://tapi.puyoquest.jp/multibattle/redirect/?room_no=${roomCode}`,
          inline: false,
        },
      )
      .setFooter(`Room opened by: ${message.member?.displayName}`);

    if (imgURL) em.setThumbnail(imgURL);

    if (roomName) {
      const colors = Object.keys(colorHex);
      for (let i = 0; i < colors.length; i++) {
        if (roomName.toLowerCase().includes(colors[i])) {
          em.setColor(colorHex[colors[i]]);
          break;
        }
      }
    }

    const msg = await message.channel.send(em);
    setTimeout(() => {
      const em = new Discord.MessageEmbed()
        .setTitle('⛔ The Battle room has closed.')
        .addFields(
          {
            name: 'Room Name',
            value: roomName || 'N/A',
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
            value: `https://tapi.puyoquest.jp/multibattle/redirect/?room_no=${roomCode}`,
            inline: false,
          },
        )
        .setFooter(`Room opened by: ${message.member?.displayName}`);
      if (imgURL) em.setThumbnail(imgURL);
      if (!msg.deleted) msg.edit(em);
    }, duration);
  },
};

export default command;
