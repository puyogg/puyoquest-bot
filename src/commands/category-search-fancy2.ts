import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki, IndexData, WikiSearchDist } from '../wiki/api';
import { Image, loadImage, createCanvas } from 'canvas';
import { ImageCache } from '../wiki/image-cache';

// Retrieve command name from filename
const name = path.parse(__filename).name;

function isWikiSearchDistArray(searchResult: (WikiSearchDist[] | undefined)[]): searchResult is WikiSearchDist[][] {
  return !searchResult.some((result) => !result || result.length === 0);
}

function isCategoryArrays(categorySet: (string[] | undefined)[]): categorySet is string[][] {
  return !categorySet.some((set) => !set || set.length === 0);
}

const IMAGE_WIDTH = 96;
const IMAGE_HEIGHT = 96;

const command: Command = {
  name: name, // admin
  usage: ['csfancy'],
  description: 'Link to a page in the PPQ section of the wiki',
  args: true,
  aliases: ['csfancy2', 'csf2'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    // const regexpMatch = args[args.length - 1].match(/\[(.*?)\]/);
    // const reqColor = regexpMatch && colors.includes(regexpMatch[1].toLowerCase()) && regexpMatch[1].toLowerCase();

    // Parse text in []'s
    const requestedBrackets = message.content.match(/\[(.*?)]/g);
    if (!requestedBrackets) {
      message.channel.send(
        `Error: You didn't provide category names in the proper format. Type a spaced list of category names, eached wrapped with []`,
      );
      return;
    } else if (requestedBrackets.length > 4) {
      message.channel.send(`Error: You requested too many categories to search on. The limit is 4.`);
      return;
    }
    const requestedCategories = requestedBrackets.map((match) => 'Category:PPQ:' + match.replace(/\[|\]/g, ''));

    // For each category, search for them on the Wiki
    const searchResults = await Promise.all(
      requestedCategories.map((category) => {
        return Wiki.search(category);
      }),
    );

    // Have to type narrow (WikiSearchDist[] | undefined)[] to WikiSearchDist[][]
    if (!isWikiSearchDistArray(searchResults)) {
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        const category = requestedCategories[i];
        if (!result || result.length === 0) {
          message.channel.send(`Error: "${category}" couldn't be found on the wiki.`);
        }
      }
      return;
    }

    // Assume the first search was the best one to define the category
    const categories = searchResults.map((result) => result[0]);

    // For each result, get the category members
    const categoryMemberArrays = await Promise.all(
      categories.map((category) => {
        return Wiki.getCategoryMembers(category.title).then((members) => {
          if (!members) return;

          return [
            ...new Set(
              members.map((member) => {
                // Remove rarities and get the unique set
                return member
                  .replace(/\/★\d-\d|\/★\d|PPQ:/g, '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '');
              }),
            ),
          ];
        });
      }),
    );

    // Have to type narrow (string[] | undefined)[] to string[][];
    if (!isCategoryArrays(categoryMemberArrays)) {
      for (let i = 0; i < categoryMemberArrays.length; i++) {
        const memberSet = categoryMemberArrays[i];
        const category = categories[i];
        if (!memberSet || memberSet.length === 0) {
          message.channel.send(`Error: There was a problem parsing the category members for ${category.title}`);
        }
      }
      return;
    }

    // Create sets for each category array
    const categoryMemberSets = categoryMemberArrays.map((categoryMemberArray) => new Set(categoryMemberArray));

    // Get the largest set.
    const setSizes = categoryMemberSets.map((set) => set.size);
    const largestMemberArray = categoryMemberArrays[setSizes.indexOf(Math.max(...setSizes))];

    // Iterate through the largestMemberArray. If the member appears in all memberArrays, then it's part of the valid list
    const validMembers = largestMemberArray.filter((member) => {
      return categoryMemberSets.every((set) => set.has(member));
    });

    if (validMembers.length === 0) {
      message.channel.send(`There are no cards that fit the specified categories.`);
      return;
    }

    // chulap/red not found !!csfancy [cards inflicting fury] [balance type]
    // 41 instead of 43 !!csfancy [hp type][cards inflicting attack up]
    // Missing space ecolo !!csfancy [card cost 64]
    // console.log(validMembers);
    message.channel.send(`Found ${validMembers.length} cards.`);

    // Look up card data from the card index
    const subset = validMembers
      .map((member) => {
        return Wiki.indexByNormalizedName?.get(member);
      })
      .filter((member) => member) as IndexData[];

    subset.sort((a, b) => parseInt(a.id || '0', 10) - parseInt(b.id || '0', 10));

    // Run the icon downloads asynchronously
    const iconURLs = await Promise.all(
      subset.map(async (card) => {
        if (!card.imgFile) return undefined;

        const url = await Wiki.getImageURL(card.imgFile);
        console.log('iconURL url', url);

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
    em.setTitle(categories.map((category) => category.title).join(', '));
    // em.setURL(`https://puyonexus.com/wiki/${searchResult[0].title.replace(/\s/g, '_')}`);
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
