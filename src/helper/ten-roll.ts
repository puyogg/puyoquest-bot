import * as Discord from 'discord.js';
import { getFullCardID, parseTemplateText } from '../wiki/parser';
import { IndexData, Wiki } from '../wiki/api';
import { createCanvas, loadImage, Image } from 'canvas';
import { CacheMap } from '../helper/cache-map';
import * as path from 'path';

class TenRoll {
  private message: Discord.Message;
  private names: string[];
  private cards: IndexData[] | undefined;
  private static cache = new CacheMap<IndexData[]>(60 * 60 * 1000);

  constructor(message: Discord.Message) {
    this.message = message;
    this.names = [];

    const name = message.member?.displayName || message.member?.nickname;
    if (!name) return;
    const normalizedName = name.toLowerCase();

    if (/^capitalis./i.test(normalizedName)) {
      this.names.push('raffina');
    } else if (/^JustVibin$/i.test(normalizedName)) {
      this.names.push('raffina', 'lidelle', 'yu & rei');
    } else if (/^TrophyHunter$/i.test(normalizedName)) {
      this.names.push('tilura', 'marvett', 'rozema', 'bestoll', 'algar');
    } else if (/^Maihen$/i.test(normalizedName)) {
      this.names.push(
        'isin',
        'eridu',
        'rukbat',
        'yogi',
        'henriette',
        'melville',
        'komone',
        'taningoat',
        'sheepro',
        'tondury',
      );
    } else if (/^Cass$/i.test(normalizedName)) {
      this.names.push(
        'strange klug',
        'ms. accord',
        'satan',
        'ecolo',
        'dark arle',
        'lemres',
        'rafisol',
        'carbuncle',
        'ex',
        'doppelganger arle',
      );
    } else if (/^xin/i.test(normalizedName)) {
      this.names.push('legamunt', 'rozatte', 'yuri', 'hartman');
    } else if (
      [/^res$/i, /^albert/i, /^richard/i, /^matthew/i, /^miriam/i, /^sullivan/i].some((name) =>
        name.test(normalizedName),
      )
    ) {
      this.names.push('albert', 'richard', 'matthew', 'miriam', 'sullivan');
    } else if (/SEGA/i.test(normalizedName)) {
      this.names.push('kitty', 'paprisu');
    } else if (/^lain/i.test(normalizedName)) {
      this.names.push('shigure');
    } else if (/^野狼院ひさし/i.test(normalizedName)) {
      this.names.push('bald', 'balbal');
    } else if (/Jeff/i.test(normalizedName)) {
      this.names.push('tee');
    } else if (/^pi$/i.test(normalizedName)) {
      this.names.push('ecolo', 'finlay');
    }

    if (this.names.length > 0) {
      const key = this.names.join(',');
      const { item: indexData, useCache } = TenRoll.cache.get(key);
      if (useCache) {
        console.log(`${new Date().toString()}: Using filtered card index from cache.`);
        this.cards = indexData;
      } else {
        console.log(`${new Date().toString()}: Fetching filtered card index to build cache.`);
        const fetchedData = Wiki.cardIndex?.filter((card) => {
          return this.names.some((name) => {
            if (!card.normalizedName) return;
            const nameRegExp = new RegExp(name, 'ig');
            return nameRegExp.test(card.normalizedName);
          });
        });
        this.cards = fetchedData || [];
        TenRoll.cache.set(key, fetchedData || []);
      }
    }
  }

  /**
   * Gets a random icon from the card index and returns the canvas loaded image
   */
  private async getRandomIcon(): Promise<Image | undefined> {
    let randCard = Wiki.getRandomCard(this.cards);
    while (randCard && randCard.id && ['1239', '2239', '3239', '4239', '5239', '1238'].includes(randCard.id)) {
      randCard = Wiki.getRandomCard(this.cards);
    }
    if (!randCard || !randCard.id || !randCard.name) {
      this.message.channel.send(`Error: There was a problem fetching the card list.`);
      return;
    }

    // Get random rarity
    let rarities = await Wiki.getCharRaritiesFromID(randCard.id);
    if (!rarities) {
      return;
    }
    rarities = rarities.filter((rarity) => rarity !== '7');
    const randRarity = rarities[Math.floor(Math.random() * rarities.length)];

    const fullID = getFullCardID(randCard.id, randRarity);

    const thumbnailFile = `File:Img${fullID}.png`;
    const iconURL = await Wiki.getImageURL(thumbnailFile);
    if (!iconURL) {
      this.message.channel.send(`Error: There was a problem fetching the card icon for ${name}`);
      return;
    }

    const icon = await loadImage(iconURL);
    return icon;
  }

  public async getBuffer(): Promise<Buffer | undefined> {
    const template = await loadImage(path.resolve(__dirname, '../images/ten_roll_template.jpg'));
    const NEW = await loadImage(path.resolve(__dirname, '../images/new.png'));
    const icons: Image[] = [];
    let error = 0;
    while (icons.length < 10) {
      const icon = await this.getRandomIcon();
      if (!icon) {
        error++;
      } else {
        icons.push(icon);
      }
      if (error >= 10) return;
    }

    const canvas = createCanvas(600, 570);
    const ctx = canvas.getContext('2d');

    // Draw the roll template onto the canvas
    ctx.drawImage(template, 0, 0);

    for (let i = 0; i < 5; i++) {
      ctx.drawImage(icons[i], 30 + 111 * i, 153);
      if (Math.floor(Math.random() * 4) === 0) {
        ctx.drawImage(NEW, 23 + 111 * i, 125);
      }
    }

    for (let i = 5; i < 10; i++) {
      ctx.drawImage(icons[i], 30 + 111 * (i - 5), 273);
      if (Math.floor(Math.random() * 4) === 0) {
        ctx.drawImage(NEW, 23 + 111 * (i - 5), 245);
      }
    }

    // GASE
    ctx.font = '30px Ubuntu';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('©GASE', 470, 550);

    // Get Data URL?
    const buffer = canvas.toBuffer();
    return buffer;
  }
}

export { TenRoll };
