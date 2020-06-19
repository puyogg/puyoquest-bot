import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['should-i-roll'],
  description: 'Ask a demon for advice.',
  args: true,
  aliases: ['shouldiroll', 'sir'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    const int = Math.floor(Math.random() * 100);

    if (int < 5) {
      message.channel.send(`Yes. Go for it! You are responsible for your own pain and suffering!`);
      return;
    } else if (int < 20) {
      message.channel.send(`No.`);
      return;
    } else if (int < 30) {
      message.channel.send(`🛑🛑🛑`);
      return;
    } else {
      message.channel.send(`Hell no.`);
      return;
    }
  },
};

export default command;
