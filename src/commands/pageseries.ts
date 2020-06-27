import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { titleCase } from 'title-case';
import { getSeriesBanner } from '../helper/series-banner';
import leven = require('leven');

const TITLE_ACCURACY_THRESHOLD = 0.85;

function potentialSeries(seriesInput: string): string[] {
  const series = seriesInput.toLowerCase();
  const potentials: string[] = [series];

  const title = series.includes('series') ? series.slice(0, series.indexOf('series')).trim() : series;
  potentials.push(title + ' series');

  potentials.push(title + 's series');
  potentials.push(title + 'es series');

  if (title.endsWith('s')) {
    potentials.push(title.slice(0, title.length - 1) + ' series');
  }

  if (title.endsWith('y')) {
    potentials.push(title.slice(0, title.length - 1) + 'ies series');
  }

  if (title.endsWith('es')) {
    potentials.push(title.slice(0, title.length - 2) + ' series');
  }

  if (title.endsWith('ies')) {
    potentials.push(title.slice(0, title.length - 3) + 'y series');
  }

  return potentials;
}

async function makeMessageOptions(files: string[], pageTitle: string): Promise<Discord.MessageOptions> {
  // Get the unique set of 4 digit char IDs
  const charIDs = [...new Set(files.map((file) => file.slice(8, 12)))];
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
    const subset = files && files.filter((file) => file.slice(8, 12) === charID);
    // Assume the last one is the highest rarity
    if (subset) highestRarityFiles.push(subset[subset.length - 1]);
  });

  const url = `https://puyonexus.com/wiki/Category:PPQ:${pageTitle.replace(/\s/g, '_')}`;
  const banner = await getSeriesBanner(highestRarityFiles);

  return (function (): Discord.MessageOptions {
    if (!banner) {
      return {
        embed: {
          title: pageTitle.replace(/\_/g, ' '),
          description: embedMsg,
          url: url,
        },
      };
    } else {
      return {
        embed: {
          title: pageTitle.replace(/\_/g, ' '),
          description: embedMsg,
          url: url,
        },
        files: [
          {
            attachment: banner,
            name: 'file.jpg',
          },
        ],
      };
    }
  })();
}
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

    const seriesPages = await Wiki.getSeriesPages();
    if (!seriesPages) {
      message.channel.send(`Error: Couldn't reach the wiki.`);
      return;
    }

    let seriesInput = args.join(' ').replace(/\s\s+/g, ' ');

    // Try to find by directly accessing the wiki page and checking if it exists
    let pageTitle: string | undefined;
    let files: string[] | undefined;
    const potentials = potentialSeries(seriesInput);
    for (let i = 0; i < potentials.length; i++) {
      const potential = potentials[i];
      [pageTitle] = await Wiki.parseRedirect(`Category:PPQ:${titleCase(potential).replace(/\s/g, '_')}`);
      pageTitle = pageTitle.replace('Category:PPQ:', '').replace(' ', '_').replace('Et_Al.', 'et_al.');
      const seriesID = await Wiki.getSeriesIDFromPage(pageTitle);
      if (!seriesID) continue;
      files = await Wiki.getFilesFromSeriesID(seriesID);
      if (files) break;
    }

    if (files) {
      const msgOptions = await makeMessageOptions(files, pageTitle || seriesInput);
      // console.log('Made message', msgOptions);
      message.channel.send(msgOptions);
      return;
    }

    // Try to find with similarity search instead
    if (!seriesInput.toLowerCase().includes('series')) seriesInput += ' series';

    // Perform similarity search against the potential series pages.
    const similarity = seriesPages.map((page) => leven(titleCase(seriesInput), page));

    // Get the name with the lowest distance
    const indMin = similarity.indexOf(Math.min(...similarity));
    const score = similarity[indMin];
    pageTitle = seriesPages[indMin];
    // https://stackoverflow.com/questions/45783385/normalizing-the-edit-distance
    const accuracy = 1 - score / Math.max(pageTitle.length, seriesInput.length);

    if (accuracy < TITLE_ACCURACY_THRESHOLD) {
      message.channel.send(
        `Error: Couldn't find a series named **${seriesInput}**. Perhaps you meant **${pageTitle}**?`,
      );
      return;
    }

    // Replace spaces in page title with underscores
    pageTitle = pageTitle.replace(/\s/g, '_');

    files = (await Wiki.getFilesFromSeriesName(pageTitle)) || [];

    // console.log('Making response from index instead.');
    const msgOptions = await makeMessageOptions(files, pageTitle || seriesInput);
    if (msgOptions) {
      message.channel.send(msgOptions);
    }
  },
};

export default command;
