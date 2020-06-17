import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { titleCase } from 'title-case';
import { getSeriesBanner } from '../helper/series-banner';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // admin
  usage: ['pageseries <PPQ Link>'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['ps'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      message.channel.send(`Error: You didn't supply a series name.`);
      return;
    }

    const seriesInput = args.join(' ').replace(/\s\s+/g, ' ');
    // let pageTitle = titleCase(seriesInput).replace(/\s/g, '_');
    let [pageTitle] = await Wiki.parseRedirect(`Category:PPQ:${titleCase(seriesInput).replace(/\s/g, '_')}`);
    // console.log('Original page title', pageTitle);
    pageTitle = pageTitle.replace('Category:PPQ:', '').replace(' ', '_').replace('Et_Al.', 'et_al.');
    // console.log('Page Title', pageTitle);
    let files = await Wiki.getFilesFromSeriesName(pageTitle);

    // If title casing messed up, then try the original message
    if (!files) {
      // console.log('Title casing messed up?');
      pageTitle = seriesInput.replace(/\s/g, '_');
      // console.log(pageTitle);
      files = await Wiki.getFilesFromSeriesName(pageTitle);
    }

    // If the page still can't be found after that, then it probably doesn't exist.
    if (!files) {
      message.channel.send(`Error: ${seriesInput} isn't a valid card series.`);
      return;
    }

    // // Card series with side colors include extraneous images.
    // files = files.filter((file) => file.includes('Img'));
    if (!files) {
      message.channel.send(`Error: There was a problem getting images for ${seriesInput} Series`);
      return;
    }

    // Get the unique set of 4 digit char IDs
    const charIDs = [...new Set(files?.map((file) => file.slice(8, 12)))];
    const validCharIDs: string[] = [];

    // Get names for each ID
    const charLinks: string[] = [];
    charIDs.forEach((charID) => {
      const card = Wiki.indexByID && Wiki.indexByID.get(charID);
      if (card) {
        charLinks.push(`[[${card.name}]](https://puyonexus.com/wiki/${card.linkName})`);
        validCharIDs.push(charID);
      }
    });

    const embedMsg = charLinks.join(' ');
    const highestRarityFiles: string[] = [];
    validCharIDs.forEach((charID) => {
      const subset = files.filter((file) => file.slice(8, 12) === charID);
      // Assume the last one is the highest rarity
      highestRarityFiles.push(subset[subset.length - 1]);
    });

    const url = `https://puyonexus.com/wiki/Category:PPQ:${pageTitle}`;
    const banner = await getSeriesBanner(highestRarityFiles);

    if (!banner) {
      message.channel.send(url);
      return;
    } else {
      message.channel.send(url, {
        embed: {
          description: embedMsg,
        },
        files: [
          {
            attachment: banner,
            name: 'file.jpg',
          },
        ],
      });
      return;
    }

    // if (pageTitle.length === 0) {
    //   message.channel.send(`Error: You didn't supply a series name.`);
    //   return;
    // } else {
    //   message.channel.send(`https://puyonexus.com/wiki/Category:PPQ:${pageTitle}_Series`);
    //   return;
    // }
  },
};

export default command;
