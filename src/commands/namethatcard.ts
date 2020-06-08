import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki } from '../wiki/api';
import { getFullCardID, getTemplateValue } from '../wiki/parser';
import { db } from '../db';

const name = path.parse(__filename).name;

export default {
  name: name, // ntc
  usage: ['ntc [stop]'],
  description: 'Play "Name that card!"',
  args: true,
  aliases: ['ntc'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
      const randCard = await Wiki.getRandomCard();
      if (!randCard) {
        message.channel.send(`Error: There was a problem fetching the card list.`);
        return;
      }

      // Get art and name from a random rarity
      const rarities = await Wiki.getCharRaritiesFromID(randCard.id);
      if (!rarities) {
        message.channel.send(`Error: There was a problem fetching rarities for ${randCard.name}`);
        return;
      }
      // const rarities = rarityData.map((rarity) => rarity.replace('★', ''));
      // console.log(rarities);
      const randRarity = rarities[Math.floor(Math.random() * rarities.length)];
      const fullID = getFullCardID(randCard.id, randRarity);

      // Request card name
      const cardData = await Wiki.getRawCardData(fullID);
      if (!cardData) {
        message.channel.send(
          `Error: There was a problem fetching the card data for ${randCard.name}. Trying a different one...`,
        );
        continue;
      }

      const name = getTemplateValue(cardData, 'name');
      const jpname = getTemplateValue(cardData, 'jpname');

      // Assume image name based on ID and find the file
      const fullArtURL = `File:Img${fullID}_l.png`;
      const imgURL = await Wiki.getImageURL(fullArtURL);
      if (!imgURL) {
        message.channel.send(
          `Error: There was a problem fetching the character portrait for ${name}. Trying a different character...`,
        );
        continue;
      }

      // Get aliases from database
      const aliasData = await db.any('SELECT nick_name FROM aliases WHERE full_name = $1', name);
      let aliases: string[] = [];
      if (aliasData && aliasData.length > 0) {
        aliases = aliasData.map((data) => data['nick_name']);
      }

      const em = new Discord.MessageEmbed();
      em.setImage(imgURL);
      const filter: Discord.CollectorFilter = (response: Discord.Message) => {
        // Also need to look up alias database later.
        // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
        const correct =
          aliases.includes(response.content.toLowerCase()) ||
          name
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase() ===
            response.content
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase() ||
          jpname
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase() ===
            response.content
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase();
        return correct;
      };
      message.channel
        .send('Who is this card?', em)
        // .then((sentMessage) => console.log(sentMessage))
        .then(() => {
          message.channel
            .awaitMessages(filter, { max: 1, time: 2 * 1000 * 60, errors: ['time'] })
            .then((collected) => {
              const firstUser = collected.first();
              if (!firstUser) return; // no user
              const member = message.guild?.member(firstUser.author);
              const username = member?.displayName;

              message.channel.send(`${username} got it correct! The card is ${name} [★${randRarity}] (${jpname}).`);
            })
            .catch(() => {
              message.channel.send(`The above card was: ${name} [★${randRarity}] (${jpname}).`);
            });
        });
      return;
    }
  },
} as Command;
