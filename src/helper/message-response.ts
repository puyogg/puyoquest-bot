import * as Discord from 'discord.js';
import fetch from 'node-fetch';
import { getFullCardID, parseTemplateText } from '../wiki/parser';
import { Wiki } from '../wiki/api';
// import { DateTime } from 'luxon';

interface ColorToString {
  [key: string]: string;
}
const activationPuyo: ColorToString = {
  red: '<:red:429944006135382017>',
  blue: '<:blue:429944006601080849>',
  green: '<:green:429944006948945931>',
  yellow: '<:yellow:429944006718521345>',
  purple: '<:purple:429944007397736448>',
};

const colorHex: ColorToString = {
  red: '#df1111',
  blue: '#1346df',
  green: '#109b08',
  yellow: '#fa9d0e',
  purple: '#991ad9',
};

// function parseTime(timeStr: string): DateTime {
//   const [year, month, day] = timeStr.split('/').map((num) => parseInt(num, 10));

//   const time = DateTime.fromObject({
//     year: year,
//     month: month,
//     day: day,
//     zone: 'Asia/Tokyo',
//   });

//   return time;
// }

/**
 * Reply with an embed containing a specific card's data.
 * @param message Message in channel to reply to
 * @param id 4 digit character ID
 * @param name Character name that the user gave. This might not have been normalized and lowercased yet.
 * @param linkName PPQ Page name. Usually this is the same as name, but some characters like "Red Paprisu" have their page as "Paprisu/Red"
 * @param rarity rarity number
 */
async function sendCardEmbed(
  message: Discord.Message,
  id: string,
  name: string,
  linkName: string,
  rarity: string,
): Promise<void> {
  // console.log(id, rarity);
  const fullCardID = getFullCardID(id, rarity);

  // Try to retrieve card page from wiki.
  const rawText = await Wiki.getRawCardData(fullCardID);
  if (!rawText) {
    // console.log(fullCardID);
    message.channel.send(`Error: ${name} is not available in rarity: ★${rarity}`);
    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${fullCardID}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data)
      .catch((e) => console.error(e));
    console.log('rawText', rawText);
    return;
  }

  const cardData = await parseTemplateText(rawText);

  // Check if the card has multiple cards of the same rarity level (e.g. 6S cards, Saint Seiya Gemini)
  // This affects how the URL is formed.
  const rarities = await Wiki.getCharRarities(linkName);
  const hasMultipleSameRarity = rarities.filter((str) => str.includes(rarity[0])).length > 1;
  const cardURL = hasMultipleSameRarity
    ? `https://puyonexus.com/wiki/PPQ:${linkName}/★${rarity[0]}-${
        rarity[rarity.length - 1].toLowerCase() === 's' ? '2' : rarity.length > 1 ? rarity[rarity.length - 1] : '1'
      }`.replace(/\s/g, '_')
    : `https://puyonexus.com/wiki/PPQ:${linkName}/★${rarity}`.replace(/\s/g, '_');
  const thumbnailURL = await Wiki.getImageURL(`File:Img${fullCardID}.png`);

  let title = `${cardData.name || name} ★${rarity}`;
  if (cardData.jpname) title += ` (${cardData.jpname})`;
  const em = new Discord.MessageEmbed().setTitle(title).setURL(cardURL);
  // .addFields([
  //   {
  //     name: 'Traits',
  //     value: `MAX Lv: ${cardData.maxlv || '?'}\nCost: ${cardData.cost || '?'}\nType: ${cardData.type1 || '?'}${
  //       cardData.type2 === 'Mass' ? '/' + cardData.type2 : ''
  //     }\n`,
  //     inline: true,
  //   },
  //   {
  //     name: `Base Lv. ${cardData.maxlv || '?'} Stats`,
  //     value: `HP: ${cardData.hpmax || '?'}\nAttack: ${cardData.atkmax || '?'}\nRecovery: ${cardData.rcvmax || '?'}\n`,
  //     inline: true,
  //   },
  // ]);

  em.addField(
    `Base Lv. ${cardData.maxlv || '?'} Stats`,
    `HP: ${cardData.hpmax || '?'}　ATK: ${cardData.atkmax || '?'}　RCV: ${cardData.rcvmax || '?'}` +
      '\n' +
      `Cost: ${cardData.cost || '?'}　Type: ${cardData.type1 || '?'}${
        cardData.type2 === 'Mass' ? '/' + cardData.type2 : ''
      }`,
  );

  // Add card main color to the left of embed
  if (cardData.color) em.setColor(colorHex[cardData.color.toLowerCase()]);
  if (thumbnailURL) em.setThumbnail(thumbnailURL);

  // Leader skills
  if (cardData.ls || cardData.lse) {
    em.addField(
      `[LS] ${cardData.ls}${(cardData.lslv && ` Lv. ${cardData.lslv}`) || ''} (${cardData.jpls}${
        (cardData.lslv && ` Lv. ${cardData.lslv}`) || ''
      })`,
      cardData.lse,
    );
  }

  // if (cardData.lste) em.addField(`[LS+] ${cardData.lst || cardData.ls} (+) (${cardData.jpls}(+))`, cardData.lste);

  if (cardData.lst) {
    em.addField(`[LS+] ${cardData.lst} (${cardData.jplst})`, cardData.lste);
  } else if (cardData.lste) {
    em.addField(`[LS+] ${cardData.name} SP (${cardData.jpname} SP)`, cardData.lste);
  }

  if (cardData.lst2) em.addField(`[LS+] ${cardData.lst2} (${cardData.jplst2})`, cardData.lst2e);
  if (cardData.lst3) em.addField(`[LS+] ${cardData.lst3} (${cardData.jplst3})`, cardData.lst3e);

  if (cardData.as || cardData.ase) {
    em.addField(
      `[AS] ${cardData.as}${(cardData.aslv && ` Lv. ${cardData.aslv}`) || ''} (${cardData.jpas}${
        (cardData.aslv && ` Lv. ${cardData.aslv}`) || ''
      }) [${activationPuyo[cardData.color.toLowerCase()]}×${cardData.asn}]`,
      cardData.ase,
    );
  }

  if (cardData.ast) {
    em.addField(
      `[AS+] ${cardData.ast} (${cardData.jpast}) [${activationPuyo[cardData.color.toLowerCase()]}×${cardData.astn}]`,
      cardData.aste,
    );
  } else if (cardData.aste) {
    em.addField(
      `[AS+] ${cardData.as} (+) (${cardData.jpas}(+)) [${activationPuyo[cardData.color.toLowerCase()]}×${
        cardData.astn
      }]`,
      cardData.aste,
    );
  }

  if (cardData.ast2)
    em.addField(
      `[AS+] ${cardData.ast2} (${cardData.jpast2}) [${activationPuyo[cardData.color.toLowerCase()]}×${cardData.astn}]`,
      cardData.ast2e,
    );
  if (cardData.ast3)
    em.addField(
      `[AS+] ${cardData.ast3} (${cardData.jpast3}) [${activationPuyo[cardData.color.toLowerCase()]}×${cardData.astn}]`,
      cardData.ast3e,
    );

  // Only show Battle Skills if it's >=Lv15, or if the card only has a BS (and no AS)
  if (parseInt(cardData.bslv, 10) >= 15 || !cardData.as || !cardData.ase) {
    em.addField(
      `[BS] ${cardData.bs}${(cardData.bslv && ` Lv. ${cardData.bslv}`) || ''} (${cardData.jpbs}${
        (cardData.bslv && ` Lv. ${cardData.bslv}`) || ''
      }) [${activationPuyo[cardData.color.toLowerCase()]}×${cardData.bsn}]`,
      cardData.bse,
    );
  }

  // // Check if ss skill is still active.
  // const time = DateTime.fromObject({ zone: 'Asia/Tokyo' });
  // if (cardData.ssend && (cardData.ss || cardData.sse) && parseTime(cardData.ssend) > time) {
  //   em.addField(
  //     `[SS] ${cardData.ss}${(cardData.sslv && ` Lv. ${cardData.sslv}`) || ''} (${cardData.jpss}${
  //       (cardData.sslv && ` Lv. ${cardData.sslv}`) || ''
  //     })`,
  //     `Date: ${cardData.ssstart} ~ ${cardData.ssend}\n` + cardData.sse,
  //   );
  // }

  const cardSeries = await Wiki.getCardSeries(id);
  const seriesText = cardSeries
    ? `[(${cardSeries})](https://puyonexus.com/wiki/Category:PPQ:${cardSeries.replace(/\s/g, '_')})`
    : '';

  const combinations: string[] = [];
  if (cardData.combin1) combinations.push(cardData.combin1);
  if (cardData.combin2) combinations.push(cardData.combin2);
  if (cardData.combin3) combinations.push(cardData.combin3);
  if (cardData.combin4) combinations.push(cardData.combin4);
  if (cardData.combin5) combinations.push(cardData.combin5);

  const combinationLinks = combinations.map((combination) => {
    return `[[${combination}]](https://puyonexus.com/wiki/Category:PPQ:${combination.replace(
      /\s/g,
      '_',
    )}_Combination/Cards)`;
  });

  const combinationsText = combinationLinks.join(' ');

  if (cardSeries) {
    em.setDescription(`${seriesText} ${combinationsText}`);
  } else {
    em.setDescription(combinationsText);
  }

  message.channel.send(em);
}

/**
 * Send an embed listing out the character's available rarities.
 * @param message Message in channel to reply to
 * @param id 4 digit character ID
 * @param name Should be the true card name, which may include special characters or accents.
 * @param linkName PPQ Page name, with spaces replaced with _. Usually linkName is the same as name, but some characters like "Red Paprisu" have their page as "Paprisu/Red"
 */
async function sendRarityEmbed(
  message: Discord.Message,
  id: string,
  name: string,
  linkName: string,
  rarestid?: string,
): Promise<void> {
  const rarities = await Wiki.getCharRarities(linkName);

  const em = new Discord.MessageEmbed()
    .setTitle(`${name} has available rarities: ${rarities.join(', ')}`)
    .setURL(`https://puyonexus.com/wiki/PPQ:${linkName}`);

  // Skip requesting all the available image files if we already know the highest rarity.
  if (rarestid) {
    const imgURL = await Wiki.getImageURL(`File:Img${rarestid}.png`);
    if (imgURL) {
      em.setThumbnail(imgURL.trim());
    }
  } else {
    const images = await Wiki.getCardImageFiles(id);
    if (images) {
      const fileName = images[images.length - 1];
      const imgURL = await Wiki.getImageURL(fileName);
      if (imgURL) {
        em.setThumbnail(imgURL.trim());
      }
    }
  }

  message.channel.send(em);
  return;
}

async function sendFullArtEmbed(
  message: Discord.Message,
  name: string,
  linkName: string,
  rarity: string,
): Promise<void> {
  const pageTitle = await Wiki.getPageTitle(linkName, rarity);
  if (!pageTitle) {
    message.channel.send(`Error: There was a problem retrieving the full art for ${name}`);
    return;
  }
  const artData = await Wiki.getArtURLsFromPageTitle(pageTitle);
  if (!artData || !artData.left) {
    message.channel.send(`Error: There was a problem retrieving the full art for ${name}`);
    return;
  }
  const em = new Discord.MessageEmbed().setTitle(`${name} (★${rarity})`);
  em.setImage(artData.left);
  em.setURL(`https://puyonexus.com/wiki/${pageTitle}`);

  const msg = await message.channel.send(em);
  const emojis = ['⬅️', '➡️', '💪'];

  // if (artData.left && !artData.right && !artData.fullPower) {
  //   return;
  // } else if (artData.left && artData.right && !artData.fullPower) {
  //   await msg.react(emojis[0]);
  //   await msg.react(emojis[1]);
  // } else if (artData.left && !artData.right && artData.fullPower) {
  //   await msg.react(emojis[0]);
  //   await msg.react(emojis[2]);
  // } else if (artData.left && artData.right && artData.fullPower) {
  //   for (let i = 0; i < emojis.length; i++) await msg.react(emojis[i]);
  // }

  if (artData.left && !artData.right && !artData.fullPower) return;
  if (artData.right || artData.fullPower) await msg.react(emojis[0]).catch((e) => console.log(e));
  if (artData.right) await msg.react(emojis[1]).catch((e) => console.log(e));
  if (artData.fullPower) await msg.react(emojis[2]).catch((e) => console.log(e));

  const filter = (reaction: Discord.MessageReaction, user: Discord.User): boolean => {
    if (user.bot) return false;
    if (reaction.emoji.name === '⬅️' && artData.left) {
      const em = new Discord.MessageEmbed().setTitle(`${name} (★${rarity})`);
      em.setImage(artData.left);
      em.setURL(`https://puyonexus.com/wiki/${pageTitle}`);
      msg.edit(em).catch((e) => console.log(e));
    } else if (reaction.emoji.name === '➡️' && artData.right) {
      const em = new Discord.MessageEmbed().setTitle(`${name} (★${rarity})`);
      em.setImage(artData.right);
      em.setURL(`https://puyonexus.com/wiki/${pageTitle}`);
      msg.edit(em).catch((e) => console.log(e));
    } else if (reaction.emoji.name === '💪' && artData.fullPower) {
      const em = new Discord.MessageEmbed().setTitle(`${name} (★${rarity}) [Full Power]`);
      em.setImage(artData.fullPower);
      em.setURL(`https://puyonexus.com/wiki/${pageTitle}`);
      msg.edit(em).catch((e) => console.log(e));
    }
    return emojis.includes(reaction.emoji.name);
  };

  msg
    .awaitReactions(filter, { max: 48, time: 300000, errors: ['time'] })
    .then(() => undefined)
    .catch((e) => console.log(e));
}

export { sendCardEmbed, sendRarityEmbed, sendFullArtEmbed };
