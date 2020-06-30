import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { Wiki } from '../wiki/api';
import { loadImage, Image, createCanvas } from 'canvas';
import { Card } from '../wiki/parser';
import { cardCombinations } from '../helper/char-combinations';

// Have this loaded outside so it stays cached.
let template: Image;
loadImage(path.resolve(__dirname, '../images/deck_template.png'))
  .then((image) => (template = image))
  .catch(() => console.error('There was a problem loading the deck template.'));

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // admin
  usage: ['admin <set-channel|rm-channel> <quest-channel|event-channel>'],
  description: 'Set or change bot settings.',
  args: false,
  aliases: [],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // Check if deck template is loaded;
    if (!template) return;

    // Don't use this command if the bot isn't fully loaded
    if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;

    if (args.length === 0) {
      message.channel.send(
        `Error: You didn't provide any cards. Make sure to put brackets around their name like [name].`,
      );
      return;
    }

    const matches = message.content.match(/\[(.*?)]/g);
    if (!matches) {
      message.channel.send(
        `Error: You didn't provide card names in the proper format. Type a spaced list of card names as [Name Rarity] or [Name]`,
      );
      return;
    }

    const cardReqs = matches.map((match) => match.replace(/\[|\]/g, ''));

    if (cardReqs.length > 9) {
      message.channel.send(`Error: You used more than 9 cards.`);
      return;
    }

    // I think Puyo Nexus's wiki api doesn't like me doing all the requests in parallel
    // with Promise.all, so here's the one-by-one await version instead.
    const msg = await message.channel.send('Querying the wiki...');
    const data: Card[] = [];
    for (let i = 0; i < cardReqs.length; i++) {
      const card = await Wiki.getCard(cardReqs[i]);
      if (card) {
        data.push(card);
      } else {
        message.channel.send(`Error: Couldn't parse [${cardReqs[i]}]`);
      }
    }
    const validData = data.filter((d) => !!d);

    if (validData.length === 0) {
      msg.edit(`Error: No cards were found.`);
      return;
    }

    // Calculate available combinations
    const combinations = cardCombinations(validData);
    const combinationLinks = combinations.map((combination) => {
      const url = Wiki.encodeSafeURL(
        `https://puyonexus.com/wiki/Category:PPQ:${combination.combinationName.replace(/\s/g, '_')}_Combination`,
      );
      const markdown = `[[${combination.combinationName}]](${url})`;
      return markdown;
    });

    // Create the image
    // Download all card icons.
    msg.edit('Downloading images...');
    const icons: Image[] = [];
    for (let i = 0; i < validData.length; i++) {
      const card = validData[i];
      if (!card) continue;
      const iconURL = await Wiki.getImageURL(`File:Img${card.code}.png`);
      if (!iconURL) continue;
      const icon = await loadImage(iconURL);
      icons.push(icon);
    }

    const canvas = createCanvas(630, 281);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < icons.length; i++) {
      const icon = icons[i];
      if (i === 0) {
        ctx.drawImage(icon, 26, 59, 160, 160);
      } else if (i >= 1 && i <= 4) {
        ctx.drawImage(icon, 198 + (i - 1) * 104, 59);
      } else if (i >= 5 && i <= 8) {
        ctx.drawImage(icon, 198 + (i - 5) * 104, 59 + 104);
      }
    }

    ctx.drawImage(template, 0, 0);

    const buffer = canvas.toBuffer();

    // Get links to cards
    const cardLinks = validData.map((card, i) => {
      const name = card.name;
      const link = card.link ? card.link.replace(/\s/g, '_') : card.name.replace(/\s/g, '_') + `/★${card.rarity}`;
      return `[[${i + 1}. ${name}]](https://puyonexus.com/wiki/PPQ:${Wiki.encodeSafeURL(link)})`;
    });

    const em = new Discord.MessageEmbed();
    em.setDescription(cardLinks.join(' '));
    // Add combinations
    if (combinationLinks.length > 0) {
      em.addField('Available combinations', combinationLinks.join(' '));
    }

    // Add leader skill
    if (validData[0].ls || validData[0].lse) {
      em.addField(
        `[LS] ${validData[0].ls}${(validData[0].lslv && ` Lv. ${validData[0].lslv}`) || ''} (${validData[0].jpls}${
          (validData[0].lslv && ` Lv. ${validData[0].lslv}`) || ''
        })`,
        validData[0].lse,
      );
    }

    if (validData[0].lst) {
      em.addField(`[LS+] ${validData[0].lst} (${validData[0].jplst})`, validData[0].lste);
    } else if (validData[0].lste) {
      em.addField(`[LS+] ${validData[0].name} SP (${validData[0].jpname} SP)`, validData[0].lste);
    }

    if (validData[0].lst2) em.addField(`[LS+] ${validData[0].lst2} (${validData[0].jplst2})`, validData[0].lst2e);
    if (validData[0].lst3) em.addField(`[LS+] ${validData[0].lst3} (${validData[0].jplst3})`, validData[0].lst3e);

    message.channel.send({
      embed: em,
      files: [buffer],
    });
  },
};

export default command;
