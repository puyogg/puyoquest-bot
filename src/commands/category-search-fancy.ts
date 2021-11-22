import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki, IndexData } from '../wiki/api';
import { Image, loadImage, createCanvas } from 'canvas';
import { ImageCache } from '../wiki/image-cache';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const numToColor = {
  '1': 'red',
  '2': 'blue',
  '3': 'green',
  '4': 'yellow',
  '5': 'purple',
} as { [key: string]: string };

const colors = ['red', 'blue', 'green', 'yellow', 'purple'];

const IMAGE_WIDTH = 96;
const IMAGE_HEIGHT = 96;

const command: Command = {
  name: name, // admin
  usage: ['csfancy'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['csfancy', 'csf'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    const regexpMatch = args[args.length - 1].match(/\[(.*?)\]/);
    const reqColor = regexpMatch && colors.includes(regexpMatch[1].toLowerCase()) && regexpMatch[1].toLowerCase();

    // Get the category title.
    const categoryTitle = reqColor
      ? 'Category:' + args.slice(0, args.length - 1).join(' ')
      : 'Category:' + args.join(' ');
    const searchResult = await Wiki.search(categoryTitle);
    if (!searchResult || searchResult.length === 0) {
      message.channel.send(`Error: "${categoryTitle}" couldn't be found on the wiki.`);
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

      message.channel.send(`The category search wasn't accurate. Did you mean one of these?`, {
        embed: em,
      });
      return;
    } else if (!reqColor) {
      message.channel.send(`https://puyonexus.com/wiki/${searchResult[0].title.replace(/\s/g, '_')}`);
      return;
    }

    const category = searchResult[0];

    // Get the categorymembers
    // 'https://puyonexus.com/mediawiki/api.php?action=query&format=json&list=categorymembers&cmtitle=Category%3APPQ+series+categories&cmlimit=1000'
    const categoryMembers = await Wiki.getCategoryMembers(category.title);
    if (!categoryMembers) {
      message.channel.send(`Error: There was a problem finding cards that fit the category ${category.title}`);
      return;
    }
    // Remove rarities, and get the unique set
    const uniqueMembers = [
      ...new Set(
        categoryMembers.map((member) =>
          member
            .replace(/\/★\d-\d|\/★\d|PPQ:/g, '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        ),
      ),
    ];

    // Subset the members based on their color.
    const subset: IndexData[] = [];
    for (let i = 0; i < uniqueMembers.length; i++) {
      const cardData = Wiki.indexByNormalizedName?.get(uniqueMembers[i]);
      if (!cardData || !cardData.id) continue;
      const cardColor = numToColor[cardData.id[0]];
      if (cardColor === reqColor) {
        subset.push(cardData);
      }
    }

    message.channel.send('Downloading images...');

    // Run the icon downloads asynchronously
    const iconURLs = await Promise.all(
      subset.map(async (card) => {
        if (!card.imgFile) return undefined;

        const url = await Wiki.getImageURL(card.imgFile);

        if (!url) return undefined;

        const imgBuffer = await ImageCache.get(url);
        return loadImage(imgBuffer);
      }),
    );
    const icons = iconURLs.filter((img) => img !== undefined) as Image[];

    const height = Math.ceil(icons.length / 5) * IMAGE_HEIGHT;
    const width = IMAGE_WIDTH * 5;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < icons.length; i++) {
      const x = (i % 5) * IMAGE_WIDTH;
      const y = Math.floor(i / 5) * IMAGE_HEIGHT;
      ctx.drawImage(icons[i], x, y, IMAGE_WIDTH, IMAGE_HEIGHT);
    }

    const buffer = canvas.toBuffer();

    // Build fields without exceeding character limits.
    let i = 0;
    let nextLink = '';
    let description = '';
    const descriptionMaxChar = 2048;

    while (i < subset.length) {
      // Get current indexes's link
      const card = subset[i];
      nextLink = `[[${card.name}]](https://puyonexus.com/wiki/PPQ:${card.linkName}) `;

      // Add the link to the description text if it won't exceed the character limit
      if (description.length + nextLink.length > descriptionMaxChar) {
        break;
      } else {
        description += nextLink;
        i++;
      }
    }

    const fieldTexts: string[] = [];

    for (let t = 0; t < 5; t++) {
      let fieldText = '';
      const fieldMaxChar = 1024;
      while (i < subset.length) {
        const card = subset[i];
        nextLink = `[[${card.name}]](https://puyonexus.com/wiki/PPQ:${card.linkName}) `;
        // Add the link to the field text if it won't exceed the character limit
        if (fieldText.length + nextLink.length > fieldMaxChar) {
          break;
        } else {
          fieldText += nextLink;
          i++;
        }
      }

      if (fieldText.length === 0) {
        break;
      }
      fieldTexts.push(fieldText);
    }

    const em = new Discord.MessageEmbed();
    em.setTitle(category.title);
    em.setURL(`https://puyonexus.com/wiki/${searchResult[0].title.replace(/\s/g, '_')}`);
    // em.setDescription(
    //   subset.map((card) => `[[${card.name}]](https://puyonexus.com/wiki/PPQ:${card.linkName})`).join(' '),
    // );
    em.setDescription(description);
    fieldTexts.forEach((text) => {
      em.addField('...', text);
    });
    em.setImage('attachment://file.png');
    message.channel.send({
      embed: em,
      files: [
        {
          attachment: buffer,
          name: 'file.png',
        },
      ],
    });
  },
};

export default command;
