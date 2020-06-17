import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki } from '../wiki/api';
import { getFullCardID, getTemplateValue } from '../wiki/parser';
import { db } from '../db';
import { colorHexes } from '../helper/embed-color';

const name = path.parse(__filename).name;
const ntcjCalls = new Discord.Collection<string, boolean>();

export default {
  name: name, // ntc
  usage: ['ntcj [stop]'],
  description: 'Play "Name that card!"',
  args: true,
  aliases: ['ntcj'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    // Don't use ntc if it was called recently.
    const guild = message.guild;
    if (!guild) return;
    if (guild && ntcjCalls.has(guild.id)) return;
    const guildID = guild.id;

    // Look up card from card index, up to 5 times in case of error.
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
      const randCard = Wiki.getRandomCard();
      if (!randCard || !randCard.id || !randCard.name) {
        message.channel.send(`Error: There was a problem fetching the card list.`);
        return;
      }

      // SEGA why did you have to make these cards.
      if (['1239', '2239', '3239', '4239', '5239', '1238'].includes(randCard.id)) {
        continue;
      }

      // Get art and name from a random rarity
      const rarities = await Wiki.getCharRaritiesFromID(randCard.id);
      if (!rarities) {
        message.channel.send(`Error: There was a problem fetching rarities for ${randCard.name}`);
        return;
      }
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
        console.log('nopssase');
      }

      const em = new Discord.MessageEmbed();
      em.setImage(imgURL);
      const colorNum = parseInt(fullID[0], 10);
      if (!isNaN(colorNum)) {
        const colorInd = colorNum - 1;
        em.setColor(colorHexes[colorInd]);
      }

      em.setFooter(`Say "${process.env.BOT_PREFIX}ntcj stop" to give up.`);

      let cancelResponse = false;

      const filter: Discord.CollectorFilter = (response: Discord.Message) => {
        if (response.content.trim().replace(/\s\s+/g, ' ').toLowerCase() === process.env.BOT_PREFIX + 'ntcj stop') {
          if (cancelResponse === false) {
            cancelResponse = true;
            message.channel.send(`The card is ${name} [★${randRarity}] (${jpname}).`);
            ntcjCalls.delete(guildID);
            return false;
          }
        }

        // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
        const correct =
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

      message.channel.send('このカードは誰ですか？', em).then(() => {
        // Add a value to the ntcCalls Map so that it can't get called again.
        ntcjCalls.set(guildID, true);

        message.channel
          .awaitMessages(filter, { max: 1, time: 2 * 1000 * 60, errors: ['time'] })
          .then(async (collected) => {
            // Cancel response if ntc stop was mentioned earlier.
            if (cancelResponse) return;
            const firstUser = collected.first();

            // Return the first user with a correct resposne.
            if (!firstUser) return; // no user
            const member = guild.member(firstUser.author);
            if (!member) return; // no member
            const username = member.displayName;

            // Send congratulations, and remove serverid from ntcCalls
            await message.channel.send(`${username}さん正解！ The card is ${name} [★${randRarity}] (${jpname}).`);
            ntcjCalls.delete(guildID);

            db.none(
              `INSERT INTO ntcj_leaderboard (user_id, server_id, correct)
                VALUES ($[userID], $[serverID], 1)
                ON CONFLICT (user_id, server_id)
                DO UPDATE SET correct = ntcj_leaderboard.correct + 1 WHERE ntcj_leaderboard.user_id = $[userID]`,
              {
                userID: member.id,
                serverID: guildID,
              },
            ).catch((e) => console.error(e));
          })
          .catch(async () => {
            if (cancelResponse) return;
            await message.channel.send(`The above card was: ${name} [★${randRarity}] (${jpname}).`);
            ntcjCalls.delete(guildID);
          });
      });
      return;
    }
  },
} as Command;
