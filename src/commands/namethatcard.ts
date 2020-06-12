import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki } from '../wiki/api';
import { getFullCardID, getTemplateValue } from '../wiki/parser';
import { db } from '../db';

const name = path.parse(__filename).name;

interface ColorToString {
  [key: string]: string;
}

const colorHex: ColorToString = {
  red: '#df1111',
  blue: '#1346df',
  green: '#109b08',
  yellow: '#fa9d0e',
  purple: '#991ad9',
};

const colorHexes = [colorHex.red, colorHex.blue, colorHex.green, colorHex.yellow, colorHex.purple];

export default {
  name: name, // ntc
  usage: ['ntc [stop]'],
  description: 'Play "Name that card!"',
  args: true,
  aliases: ['ntc'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
      const randCard = await Wiki.getRandomCard();
      if (!randCard) {
        message.channel.send(`Error: There was a problem fetching the card list.`);
        return;
      }

      // // Only give Xin Hartmann lol
      // const member = message.member;
      // if (!member) return;
      // const username = member.displayName;
      // if (username.toLowerCase().includes('xin')) {
      //   randCard.id = '4203';
      //   randCard.name = 'Hartmann?';
      // }

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
      const colorNum = parseInt(fullID[0], 10);
      if (!isNaN(colorNum)) {
        const colorInd = colorNum - 1;
        em.setColor(colorHexes[colorInd]);
      }
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
            .then(async (collected) => {
              const firstUser = collected.first();
              if (!firstUser) return; // no user
              const member = message.guild?.member(firstUser.author);
              if (!member) return; // no member
              const username = member.displayName;

              message.channel.send(`${username} got it correct! The card is ${name} [★${randRarity}] (${jpname}).`);

              // Add value to database
              const guild = message.guild;
              if (!guild) {
                message.channel.send(`There was a problem updating your score on the leaderboard though.`);
                return;
              }
              db.none(
                `INSERT INTO ntc_leaderboard (user_id, server_id, correct)
                VALUES ($[userID], $[serverID], 1)
                ON CONFLICT (user_id)
                DO UPDATE SET correct = ntc_leaderboard.correct + 1 WHERE ntc_leaderboard.user_id = $[userID]`,
                {
                  userID: member.id,
                  serverID: guild.id,
                },
              )
                // .then((data) => {
                //   message.channel.send(`Successfully updated score?`);
                //   console.log(data);
                //   return data;
                // })
                .catch((e) => console.error(e));
            })
            .catch(() => {
              message.channel.send(`The above card was: ${name} [★${randRarity}] (${jpname}).`);
            });
        });
      return;
    }
  },
} as Command;
