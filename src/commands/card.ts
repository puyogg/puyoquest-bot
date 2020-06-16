import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki } from '../wiki/api';
import { parseCardReqMsg } from '../wiki/parser';
import { sendCardEmbed, sendRarityEmbed } from '../helper/message-response';
import { getNameFromAlias } from '../helper/match-alias';
import { titleCase } from 'title-case';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['card <name|kana> [rarity#]'],
  description: 'Look up a card on the Puyo Nexus Wiki',
  args: true,
  aliases: ['c'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

    if (args.length === 0) {
      message.channel.send(`Error: You didn't supply a card name.`);
      return;
    }

    // Parse requested name and rarity
    const parsedNameAndRarity = parseCardReqMsg(message.content);
    let [name] = parsedNameAndRarity;
    const [, rarity] = parsedNameAndRarity;
    let slashColor = '';

    // Remove /Color from fodder cards
    if (/\/red|\/blue|\/green|\/yellow|\/purple/.test(name.toLowerCase())) {
      [name, slashColor] = name.split('/');
    }

    // Check if the name is an aliased name
    name = (await getNameFromAlias(name.toLowerCase())) || name;

    // Fix fodder cards
    // if (/\/red|\/blue|\/green|\/yellow|\/purple/.test(name.toLowerCase())) {
    //   name = name.split('/')[0] + '/' + titleCase(slashColor);
    // }
    if (slashColor) {
      name = name.split('/')[0] + '/' + titleCase(slashColor);
    }

    // Update name with English name if the user gave it in Japanese.
    if (Wiki.isJP(name)) {
      const indexData = Wiki.indexByJPName.get(name);
      if (indexData && indexData.name) {
        name = indexData.name;
      } else {
        const potentialName = await Wiki.getCharName(name);
        if (potentialName) {
          name = potentialName;
        } else {
          // message.channel.send(`Error: Couldn't find a translation for **${name}**`);
          // return;

          const similarName = await Wiki.similaritySearchJP(name);
          message.channel.send(
            `Error: Couldn't find a translation for **${name}**.${
              similarName ? ` Perhaps you meant **${similarName}**?` : ''
            }`,
          );
          return;
        }
      }
    }

    // If the card can be found in the cached card index, use that.
    // Else, need to query the wiki a couple times to get the proper name, link name, and rarity
    const indexData = Wiki.indexByNormalizedName.get(
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    );
    if (
      indexData &&
      indexData.id &&
      indexData.id !== '0000' &&
      indexData.name &&
      indexData.linkName &&
      indexData.rarestid
    ) {
      // console.log('Found the card in the card index.');
      // console.log('Index Data', indexData);

      // Gemini Saga exception
      if (message.content.toLowerCase().includes('evil') && indexData.id === '4362' && rarity === '6') {
        indexData.id = '5362';
      } else if (message.content.toLowerCase().includes('divine') && indexData.id === '5362' && rarity === '6') {
        indexData.id = '4362';
      }

      if (rarity) {
        sendCardEmbed(message, indexData.id, indexData.name, indexData.linkName, rarity);
      } else {
        sendRarityEmbed(message, indexData.id, indexData.name, indexData.linkName, indexData.rarestid);
      }
    } else {
      // Update the name if it leads to a redirect
      const redirectName = await Wiki.checkCharRedirect(
        name
          .replace(/\s/g, '_')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      );
      if (redirectName) {
        if (name !== redirectName) {
          name = redirectName;
        }
      } else {
        const similarName = await Wiki.similaritySearch(name);
        message.channel.send(
          `Error: Couldn't find a card named **${name}**.${
            similarName ? ` Perhaps you meant **${similarName}**?` : ''
          }`,
        );
        return;
      }

      let charID = await Wiki.getCharID(name);
      // Gemini Saga exception
      if (message.content.toLowerCase().includes('evil') && charID === '4362') {
        charID = '5362';
      } else if (message.content.toLowerCase().includes('divine') && charID === '5362') {
        charID = '4362';
      }

      if (!charID) {
        const similarName = await Wiki.similaritySearch(name);
        message.channel.send(
          `Error: Couldn't find a card named **${name}**.${
            similarName ? ` Perhaps you meant **${similarName}**?` : ''
          }`,
        );
        return;
      }

      if (rarity) {
        sendCardEmbed(message, charID, name, name.replace(/\s/g, '_'), rarity);
      } else {
        sendRarityEmbed(message, charID, name, name.replace(/\s/g, '_'));
      }
    }
  },
};

export default command;
