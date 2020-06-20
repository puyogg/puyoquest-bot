import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // admin
  usage: ['page <PPQ Link>'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['p'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // const pageTitle = args.join('_');
    const pageTitle = args.join(' ');

    // if (pageTitle.length === 0) {
    //   message.channel.send('https://puyonexus.com/wiki/PPQ:Portal');
    //   return;
    // } else if (pageTitle.includes(':')) {
    //   message.channel.send(`https://puyonexus.com/wiki/${pageTitle}`);
    //   return;
    // } else {
    //   message.channel.send(`https://puyonexus.com/wiki/PPQ:${pageTitle}`);
    //   return;
    // }

    // Use MediaWiki Query>Search API to allow for case insensitive matching
    const searchResult = await Wiki.search(pageTitle);
    if (!searchResult || searchResult.length === 0) {
      message.channel.send(`Error: "${pageTitle}" couldn't be found on the wiki.`);
      return;
    }

    if (searchResult[0].accuracy < 0.6) {
      const em = new Discord.MessageEmbed();
      for (let i = 0; i < searchResult.length; i++) {
        em.addField(
          `Match: ${Math.round(searchResult[i].accuracy * 100)}%`,
          `https://puyonexus.com/wiki/${searchResult[i].title.replace(/\s/g, '_')}`,
        );
        if (i === 2) break;
      }

      message.channel.send(`The page search wasn't accurate. Did you mean one of these?`, {
        embed: em,
      });
      return;
    } else {
      message.channel.send(`https://puyonexus.com/wiki/${searchResult[0].title.replace(/\s/g, '_')}`);
      return;
    }
  },
};

export default command;
