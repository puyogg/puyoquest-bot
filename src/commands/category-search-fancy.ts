import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki, IndexData } from '../wiki/api';
import { Image, loadImage, createCanvas } from 'canvas';

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

const command: Command = {
  name: name, // admin
  usage: ['csfancy'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['csfancy'],
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

    // Display an image containing all the cards
    const icons: Image[] = [];
    for (let i = 0; i < subset.length; i++) {
      const card = subset[i];
      if (!card.imgFile) continue;
      const iconURL = await Wiki.getImageURL(card.imgFile);
      if (!iconURL) continue;
      const icon = await loadImage(iconURL);
      icons.push(icon);
    }

    const height = Math.ceil(icons.length / 5) * icons[0].height;
    const width = icons[0].width * 5;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < icons.length; i++) {
      const x = (i % 5) * icons[i].width;
      const y = Math.floor(i / 5) * icons[i].height;
      ctx.drawImage(icons[i], x, y);
    }

    const buffer = canvas.toBuffer();

    const em = new Discord.MessageEmbed();
    em.setTitle(category.title);
    em.setURL(`https://puyonexus.com/wiki/${searchResult[0].title.replace(/\s/g, '_')}`);
    em.setDescription(
      subset.map((card) => `[[${card.name}]](https://puyonexus.com/wiki/PPQ:${card.linkName})`).join(' '),
    );
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
