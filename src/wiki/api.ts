import fetch from 'node-fetch';
import * as Discord from 'discord.js';
import { getTemplateValue, Card, parseCardReqMsg, getFullCardID, parseTemplateText } from './parser';
import * as leven from 'leven';
import { DateTime } from 'luxon';
import { db } from '../db';
import { getNameFromAlias } from '../helper/match-alias';
import { titleCase } from 'title-case';

interface TitleResult {
  title: string;
}

interface EventData {
  name: string;
  jpname: string;
  start: string;
  end: string;
  link: string;
  feature: string;
}

interface IndexData {
  id: string | null;
  rarestid: string | null;
  name: string | null;
  normalizedName: string | null;
  linkName: string | null;
  imgFile: string | null;
  jpname: string | null;
}

interface QueryObject {
  [key: string]: string;
}

interface FullArtData {
  left?: string;
  right?: string;
  fullPower?: string;
}

interface AliasDBReq {
  nick_name: string;
  full_name: string;
}

interface GroupedAliases {
  fullName: string;
  aliases: string[];
}

interface WikiLookup {
  pageid: number;
  title: string;
}

interface WikiSearch extends WikiLookup {
  timestamp: string;
}

export interface WikiSearchDist extends WikiSearch {
  leven: number;
  accuracy: number;
}

const indexOfMax = (arr: number[]): number => {
  if (arr.length === 0) {
    return -1;
  }

  let max = arr[0];
  let maxIndex = 0;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      maxIndex = i;
      max = arr[i];
    }
  }

  return maxIndex;
};

class Wiki {
  private static api = 'https://puyonexus.com/mediawiki/api.php';
  public static indexList: string[] | null = null;
  public static cardIndex: IndexData[] | null = null;
  public static indexByID: Discord.Collection<string, IndexData> | null = null;
  public static indexByNormalizedName: Discord.Collection<string, IndexData> | null = null;
  public static indexByJPName: Discord.Collection<string, IndexData> | null = null;

  /** Convenience Functions */
  /**
   * Form a valid request URL using the api key and search params.
   * @param queryObject parameters with values to search for
   */
  public static url(queryObject: QueryObject): string {
    return Wiki.api + '?' + new URLSearchParams(queryObject).toString();
  }

  /**
   * Check if the string contains Japanese characters.
   * https://stackoverflow.com/questions/43418812/check-whether-a-string-contains-japanese-chinese-characters
   * @param str kana
   */
  public static isJP(str: string): boolean {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(str);
  }

  /**
   * Search the wiki for a template that has an exact match of the given kana, and
   * return the associated English name.
   * @param kana
   */
  public static async getCharName(kana: string): Promise<string | undefined> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: kana,
      srnamespace: '10',
      srlimit: '200',
      srwhat: 'text',
      srprop: '',
    });

    const templateIDs = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const searchResult: TitleResult[] = data.query.search;
        const ids = searchResult.map((result) => result['title'].slice('Template:'.length));
        const idSet = [...new Set(ids)];
        return idSet.slice(0, 10);
      });

    for (let i = 0; i < templateIDs.length; i++) {
      const potentialTemplate = Wiki.url({
        action: 'parse',
        format: 'json',
        page: `Template:${templateIDs[i]}`,
        prop: 'wikitext',
      });

      const wikitext: string = await fetch(potentialTemplate)
        .then((res) => res.json())
        .then((data) => data.parse.wikitext['*']);

      const jpname = wikitext
        .split('\n')
        .filter((text) => text.includes('|jpname='))
        .map((text) => text.trim())[0]
        .replace('|jpname=', '');

      if (jpname === kana) {
        // Update name with the English name
        const name = wikitext
          .split('\n')
          .filter((text) => text.includes('|name='))
          .map((text) => text.trim())[0]
          .replace('|name=', '');
        return name;
      }
    }
  }

  /**
   * Use the character's English name to find their 4 digit wiki ID.
   * @param name name in English
   */
  public static async getCharID(name: string): Promise<string | undefined> {
    return await fetch(`https://puyonexus.com/wiki/PPQ:${name}?action=raw`)
      .then((res) => {
        if (res.status === 404) {
          return;
        } else {
          return res.text();
        }
      })
      .then((data) => {
        if (data && data.length > 0) {
          return data.split('|')[0].slice(2);
        } else {
          return;
        }
      });
  }

  /**
   * List a character's ★ rarities.
   * @param name Name in English
   */
  public static async getCharRarities(name: string): Promise<string[]> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      list: 'prefixsearch',
      pssearch: `PPQ:${name}/★`,
    });

    const titles: TitleResult[] = await fetch(url)
      .then((res) => res.json())
      .then((data) => data.query.prefixsearch);

    return titles.map((page) => {
      const split = page.title.split('/');
      return split[split.length - 1];
    });
  }

  /**
   * @param charID 4 Digit ID
   */
  public static async getCharRaritiesFromID(charID: string): Promise<string[] | undefined> {
    // Gemini Saga exception
    const trueCharID = charID === '5362' ? '4362' : charID;

    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${trueCharID}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    if (!rawText) return;

    const cards = [];
    for (let i = 1; i <= 10; i++) {
      const templateValue = getTemplateValue(rawText, `card${i}`);
      // console.log(templateValue);
      if (!templateValue) break;
      cards.push(templateValue);
    }

    cards.map((card) => card.slice(card.length - 2, card.length));

    if (cards.some((card) => card.endsWith('16'))) {
      cards.forEach((card, i) => {
        if (card.endsWith('06')) {
          cards[i] = '6-1';
        } else if (card.endsWith('16')) {
          cards[i] = '6-2';
        } else {
          cards[i] = card[card.length - 1];
        }
      });
    } else {
      cards.forEach((card, i) => {
        cards[i] = card[card.length - 1];
      });
    }

    return cards;
  }

  /**
   * Get the names of the card thumbnails for each of a character's rarities.
   * NOTE: This isn't a URL. It's a MediaWiki page title with the format:
   * 'File:Image.png'
   * @param charID 4 digit character ID
   */
  public static async getCardImageFiles(charID: string): Promise<string[] | undefined> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      prop: 'images',
      titles: `Template:${charID}`,
    });

    const imageURLs: string[] | undefined = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const results: TitleResult[] | undefined = data.query.pages[Object.keys(data.query?.pages)[0]].images;
        if (!results) return;
        const filteredResults = results
          .map((result) => result.title)
          .filter((name) => {
            // Exception for Evil Incarnation Gemini Saga
            const isEvilGemini = charID === '4362' && name.includes('5362');
            return name.includes(charID) || isEvilGemini;
          });

        if ((charID === '4362' || charID === '5362') && filteredResults.length === 3) {
          return [filteredResults[0], filteredResults[2], filteredResults[1]];
        } else {
          return filteredResults;
        }
      });

    return imageURLs;
  }

  /**
   * Get the full image URL for a MediaWiki File page.
   * @param filepage
   */
  public static async getImageURL(filepage: string): Promise<string | undefined> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      titles: filepage,
      iiprop: 'url',
    });

    const image: string | undefined = await fetch(url)
      .then((res) => {
        // console.log('Status:', res.status);
        return res.json();
      })
      .then((data) => {
        const parent = data.query.pages[Object.keys(data.query?.pages)[0]];
        if (parent.imageinfo) {
          const imageinfo = parent.imageinfo[0];
          if (imageinfo.url) {
            return imageinfo.url;
          }
        }
      });

    return image;
  }

  /**
   * Get card data from a card template
   * @param charID 4 digit character ID
   * @param rarity rarity number, but as a string
   */
  public static async getRawCardData(fullCardID: string): Promise<string | undefined> {
    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${fullCardID}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    return rawText;
  }

  /**
   * Get the current timed events from the wiki page. If the page hasn't been made yet,
   * it'll fetch the data from the previous month.
   */
  public static async getTimedEvents(): Promise<EventData[] | undefined> {
    // Get the current time in Japan
    const time = DateTime.fromObject({ zone: 'Asia/Tokyo' });
    const newsURL = `https://puyonexus.com/wiki/PPQ:Event_News_Archive/${time.monthLong}_${time.year}?action=raw`;

    const data = await fetch(newsURL)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        } else {
          return;
        }
      })
      .then((d) => d);

    // Exit if the fetch failed
    if (!data) return;

    // Parse raw text data into a usable JSON format (EventData interface)
    const rawEvents = data
      .slice(data.indexOf('{{EventNews'))
      .split('{{EventNews')
      .filter((str) => str.length > 0);

    const events = rawEvents
      .map((event) => {
        return {
          name: getTemplateValue(event, 'name'),
          jpname: getTemplateValue(event, 'jpname'),
          start: getTemplateValue(event, 'start'),
          end: getTemplateValue(event, 'end'),
          link: getTemplateValue(event, 'link'),
          feature: getTemplateValue(event, 'feature').replace(/{{/g, ''),
        };
      })
      .filter((event) => {
        // Filter out events that had already passed.
        // Exception if the event is still in (preview)
        if (!event.end) {
          const [yearEnd, monthEnd, dayEnd] = [2424, 2, 24];
          const [hourEnd, minuteEnd] = [2, 24];
          const endTime = DateTime.fromObject({
            year: yearEnd,
            month: monthEnd,
            day: dayEnd,
            hour: hourEnd,
            minute: minuteEnd,
            zone: 'Asia/Tokyo',
          });
          return endTime > time;
        }

        const [yearEnd, monthEnd, dayEnd] = event.end
          .split(' ')[0]
          .split('/')
          .map((num) => parseInt(num, 10));
        const [hourEnd, minuteEnd] = event.end
          .split(' ')[1]
          .split(':')
          .map((num) => parseInt(num, 10));

        const endTime = DateTime.fromObject({
          year: yearEnd,
          month: monthEnd,
          day: dayEnd,
          hour: hourEnd,
          minute: minuteEnd,
          zone: 'Asia/Tokyo',
        });

        return endTime > time;
      });

    return events;
  }

  /**
   * Check if the character's name has a redirect to a different page.
   * @param name Name in English.
   */
  public static async checkCharRedirect(name: string): Promise<string | undefined> {
    const data = await fetch(`https://puyonexus.com/wiki/PPQ:${encodeURI(name)}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        } else {
          return;
        }
      })
      .then((d) => d);

    if (!data) return;

    if (data.includes('Category')) return;

    if (data.startsWith('#REDIRECT')) {
      // return data.slice(data.indexOf('[[PPQ:') + '[[PPQ:'.length, data.indexOf(']]'));
      return data.slice(data.indexOf('PPQ:') + 'PPQ:'.length, data.indexOf(']]'));
    }

    return name;
  }

  public static async buildCardIndex(): Promise<void> {
    const indexPage = [
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/1',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/101',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/201',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/301',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/401',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/501',
      'https://puyonexus.com/wiki/PPQ:Card_Index/UIC',
    ];

    const cardIndex: IndexData[] = [];
    for (const url of indexPage) {
      const page = await fetch(`${url}?action=raw&templates=expand`)
        .then((res) => {
          if (res.status === 200) return res.text();
        })
        .then((data) => data)
        .catch((e) => console.error(e));

      if (!page) {
        console.log(`Error accessing page: `, url);
        return;
      }

      const chars = page
        .split('\n')
        .filter((row) => row.startsWith('| [[File:'))
        .map((row) => {
          const idMatch = row.match(/\[\[File:Img(.*?).png/);
          const nameMatch = row.match(/}}}\|(.*?)\|link=/);
          const linkNameMatch = row.match(/\|link=PPQ:(.*?)]]/);
          const imgFileMatch = row.match(/\[\[(.*?)\|{{{/);
          const jpNameMatch = row.match(/\"ja\">(.*?)<\/span>/);
          const indexData: IndexData = {
            id: idMatch && idMatch[1].slice(0, 4),
            rarestid: idMatch && idMatch[1],
            name: nameMatch && nameMatch[1],
            normalizedName:
              nameMatch &&
              nameMatch[1]
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase(),
            linkName: linkNameMatch && linkNameMatch[1].replace(/\s/g, '_'),
            imgFile: imgFileMatch && imgFileMatch[1],
            jpname: jpNameMatch && jpNameMatch[1],
          };
          return indexData;
        });

      for (let i = 0; i < chars.length; i++) {
        while (chars.slice(i + 1).findIndex((char) => char.name === chars[i].name) !== -1) {
          chars.splice(i + 1, 1);
        }
      }

      cardIndex.push(...chars);
    }

    Wiki.buildCardIndexFromCache(cardIndex);
  }

  public static buildCardIndexFromCache(cache: IndexData[]): void {
    Wiki.cardIndex = cache;
    Wiki.indexByID = new Discord.Collection();
    Wiki.indexByNormalizedName = new Discord.Collection();
    Wiki.indexByJPName = new Discord.Collection();
    cache.forEach((card) => {
      if (card.id) Wiki.indexByID?.set(card.id, card);
      if (card.normalizedName) Wiki.indexByNormalizedName?.set(card.normalizedName, card);
      if (card.jpname) Wiki.indexByJPName?.set(card.jpname, card);
    });
  }

  // public static async getRandomCard(): Promise<{ id: string; name: string } | undefined> {
  //   if (!Wiki.cardIndex) return;

  //   const attempts = 24;
  //   for (let i = 0; i < attempts; i++) {
  //     const indexData = Wiki.cardIndex[Math.floor(Math.random() * Wiki.cardIndex.length)];
  //     if (!indexData.id) continue;
  //     const randID = indexData.id;
  //     const nameReqURL = `https://puyonexus.com/mediawiki/api.php?action=parse&format=json&text=%7B%7B${randID}%7Cindex2%7D%7D&contentmodel=wikitext`;
  //     const templateData: string = await fetch(nameReqURL)
  //       .then((res) => res.json())
  //       .then((data) => data.parse.text['*']);
  //     const name = templateData.slice(
  //       templateData.indexOf('title="') + 'title="'.length,
  //       templateData.indexOf('">', templateData.indexOf('title="') + 'title="'.length),
  //     );

  //     // Check if a valid card was found
  //     if (name.includes('page does not exist')) {
  //       continue;
  //     } else {
  //       return { id: randID, name: name };
  //     }
  //   }
  // }

  public static getRandomCard(cards?: IndexData[]): IndexData | undefined {
    if (!Wiki.cardIndex) return;

    if (cards && cards.length > 0) {
      const i = Math.floor(Math.random() * cards.length);
      return cards[i];
    }

    const i = Math.floor(Math.random() * Wiki.cardIndex.length);
    return Wiki.cardIndex[i];
  }

  public static async getFilesOnPage(pageTitle: string): Promise<string[] | undefined> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      prop: 'images',
      titles: pageTitle,
      imlimit: '75',
    });

    const filePages: string[] | undefined = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const results: TitleResult[] = data.query.pages[Object.keys(data.query?.pages)[0]].images;
        return results.map((result) => result.title);
      })
      .catch(() => undefined);

    return filePages;
  }

  public static async getRawText(pageTitle: string): Promise<string | undefined> {
    const rawText = await fetch(`https://puyonexus.com/wiki/${pageTitle}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data)
      .catch(() => undefined);

    return rawText;
  }

  public static async getSeriesIDFromPage(seriesName: string): Promise<string | undefined> {
    const pageTitle = `Category:PPQ:${seriesName}`;
    const rawText = await this.getRawText(pageTitle);
    if (!rawText) return;
    const regMatch = rawText?.match(/{{(.*?)\|/);
    const id = regMatch && regMatch[1];
    return id || undefined;
  }

  public static async getFilesFromSeriesName(seriesName: string): Promise<string[] | undefined> {
    const pageTitle = `Category:PPQ:${seriesName}`;
    const files = await Wiki.getFilesOnPage(pageTitle);
    return files;
  }

  public static async getFilesFromSeriesID(seriesID: string): Promise<string[] | undefined> {
    const pageTitle = `Template:${seriesID}`;
    const files = await Wiki.getFilesOnPage(pageTitle);
    return files;
  }

  /**
   * @param fullTitle e.g. PPQ:Link_Name/★7
   * @returns Array of full path URLs to the images
   */
  public static async getArtURLsFromPageTitle(pageTitle: string): Promise<FullArtData | undefined> {
    const filePages = await Wiki.getFilesOnPage(pageTitle);
    if (!filePages || filePages.length === 0) return;
    const fullArts = filePages
      .filter((file) => /l\.png|\sr\.png|\_r\.png|ss.png/.test(file))
      .map((file) => file.replace(/\s/g, '_'));

    const fullArtData: FullArtData = {};
    // Find the full image path for each File:Image#####_.png
    for (let i = 0; i < fullArts.length; i++) {
      if (/l\.png/.test(fullArts[i])) {
        fullArtData.left = await Wiki.getImageURL(fullArts[i]);
      } else if (/r\.png/.test(fullArts[i])) {
        fullArtData.right = await Wiki.getImageURL(fullArts[i]);
      } else if (/ss\.png/.test(fullArts[i])) {
        fullArtData.fullPower = await Wiki.getImageURL(fullArts[i]);
      }
    }

    return fullArtData;
  }

  public static async getPageTitle(linkName: string, rarity: string): Promise<string | undefined> {
    const rarities = await Wiki.getCharRarities(linkName);
    const hasMultipleSameRarity = rarities.filter((str) => str.includes(rarity[0])).length > 1;
    const pageTitle = hasMultipleSameRarity
      ? `PPQ:${linkName}/★${rarity[0]}-${
          rarity[rarity.length - 1].toLowerCase() === 's' ? '2' : rarity.length > 1 ? rarity[rarity.length - 1] : '1'
        }`.replace(/\s/g, '_')
      : `PPQ:${linkName}/★${rarity}`.replace(/\s/g, '_');

    return pageTitle;
  }

  public static async getFullArt(linkName: string, rarity: string): Promise<FullArtData | undefined> {
    const pageTitle = await Wiki.getPageTitle(linkName, rarity);
    if (!pageTitle) return;

    const artData = await Wiki.getArtURLsFromPageTitle(pageTitle);
    return artData;
  }

  public static async similaritySearch(name: string, threshold = 0.25): Promise<string | undefined> {
    if (!Wiki.cardIndex) return;
    const prob: number[] = [];
    Wiki.cardIndex.forEach((indexData) => {
      if (!indexData.normalizedName) return;
      const dist = leven(
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
        indexData.normalizedName,
      );

      prob.push(1 - dist / name.length);
    });

    // Check aliases too
    const allAliases: AliasDBReq[] = await db.any('SELECT * FROM aliases');
    const aliasProb: number[] = [];
    allAliases.forEach((row) => {
      const dist = leven(
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
        row.nick_name,
      );

      aliasProb.push(1 - dist / name.length);
    });

    const indexMax = indexOfMax(prob);
    const aliasIndexMax = indexOfMax(aliasProb);

    const maxProb = prob[indexMax];
    const maxAliasProb = aliasProb[aliasIndexMax] || 0;

    if (maxProb < threshold && maxAliasProb < threshold) return;
    if (maxProb >= maxAliasProb) {
      const likelyName = Wiki.cardIndex[indexMax].name;
      if (!likelyName) return;
      return likelyName;
    } else {
      const likelyData =
        aliasIndexMax < allAliases.length &&
        aliasIndexMax !== -1 &&
        Wiki.indexByNormalizedName?.get(
          allAliases[aliasIndexMax].full_name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        );
      if (!likelyData || !likelyData.name) return;
      return likelyData.name;
    }
  }

  public static async similaritySearchJP(name: string): Promise<string | undefined> {
    if (!Wiki.cardIndex) return;
    const prob: number[] = [];
    Wiki.cardIndex.forEach((indexData) => {
      if (!indexData.jpname) return;
      const dist = leven(
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
        indexData.jpname,
      );

      prob.push(1 - dist / name.length);
    });

    const indexMax = indexOfMax(prob);
    const likelyName = Wiki.cardIndex[indexMax].jpname;
    const likelyEnglishName = Wiki.cardIndex[indexMax].name;
    if (!likelyName || !likelyEnglishName) return;
    return `${likelyName} (${likelyEnglishName})`;
  }

  public static async listAllAliases(): Promise<GroupedAliases[] | undefined> {
    const fullNamesData = await db.any('SELECT DISTINCT full_name FROM aliases ORDER BY full_name');
    const allAliases: AliasDBReq[] = await db.any('SELECT * FROM aliases ORDER BY full_name');

    if (fullNamesData.length === 0 || allAliases.length === 0) return;

    const fullNames: string[] = fullNamesData.map((data) => data['full_name']);

    const groupedAliases: GroupedAliases[] = [];

    fullNames.forEach((fullName) => {
      const aliases = allAliases.filter((row) => row['full_name'] === fullName).map((row) => row['nick_name']);
      groupedAliases.push({
        fullName: fullName,
        aliases: aliases,
      });
    });

    return groupedAliases;
  }

  public static async getCardSeries(charID: string): Promise<string | undefined> {
    const series = 'S' + charID.slice(1, 4);

    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${series}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    if (!rawText) return;

    // Check if the character is actually in this template. Sometimes the wiki has them
    // coded with the same series number, even though they aren't...
    const id4 = charID.slice(0, 4);
    const matcher = new RegExp(`char\\d=${id4}|char\\d\\d=${id4}`);
    if (!matcher.test(rawText)) {
      return '';
    }

    return getTemplateValue(rawText, 'name');
  }

  /**
   * Get the name listed on Template:####
   * @param charID 4 digit char ID
   */
  public static async getTrueName(charID: string): Promise<string | undefined> {
    // Gemini Saga Exception
    const trueCharID = charID === '5362' ? '4362' : charID;

    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${trueCharID}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    if (!rawText) return;

    return getTemplateValue(rawText, 'name');
  }

  public static async parseRedirect(pageTitle: string): Promise<[string, boolean]> {
    const data = await fetch(`https://puyonexus.com/wiki/${encodeURI(pageTitle)}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        } else {
          return;
        }
      })
      .then((d) => d);

    if (!data) return [pageTitle, false];

    if (data.startsWith('#REDIRECT')) {
      // return data.slice(data.indexOf('[[PPQ:') + '[[PPQ:'.length, data.indexOf(']]'));
      if (data.includes('[[:')) {
        return [data.slice(data.indexOf('[[:') + '[[:'.length, data.indexOf(']]')), true];
      } else {
        return [data.slice(data.indexOf('[[') + '[['.length, data.indexOf(']]')), true];
      }
    } else {
      return [pageTitle, false];
    }
  }

  public static async getSeriesPages(): Promise<string[] | undefined> {
    const url =
      'https://puyonexus.com/mediawiki/api.php?action=query&format=json&list=categorymembers&cmtitle=Category%3APPQ+series+categories&cmlimit=1000';
    const data = await fetch(url)
      .then((res) => res.json())
      .then((d) =>
        (d.query.categorymembers as { pageid: number; ns: number; title: string }[]).map((obj) =>
          obj['title'].replace('Category:PPQ:', ''),
        ),
      )
      .catch(() => undefined);

    return data;
  }

  public static async search(str: string): Promise<WikiSearchDist[] | undefined> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: str,
      srlimit: '500',
      srwhat: 'title',
      srinfo: '',
      srprop: 'timestamp',
    });

    const searchResult = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.query && data.query.search) {
          const search = data.query.search as WikiSearch[];
          const results: WikiSearchDist[] = search.map((s) => {
            const withDist: WikiSearchDist = {
              pageid: s.pageid,
              title: s.title,
              timestamp: s.timestamp,
              leven: leven(str, s.title),
              accuracy: 0,
            };
            withDist.accuracy = 1 - withDist.leven / Math.max(s.title.length, str.length);
            return withDist;
          });
          return results;
        }
      })
      .catch(() => undefined);

    if (!searchResult) return;

    // Sort by lowest leven distance
    searchResult.sort((a, b) => a.leven - b.leven);

    return searchResult;
  }

  public static async getCategoryMembers(categoryPage: string): Promise<string[] | undefined> {
    let url = Wiki.url({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: categoryPage,
      cmlimit: '500',
    });

    let hasContinue = true;
    const members: string[] = [];
    let cmcontinue = '';

    while (hasContinue) {
      const newMembers = await fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data?.continue) {
            cmcontinue = data.continue.cmcontinue;
            url = Wiki.url({
              action: 'query',
              format: 'json',
              list: 'categorymembers',
              cmtitle: categoryPage,
              cmlimit: '500',
              continue: data.continue.continue,
              cmcontinue: cmcontinue,
            });
          } else {
            hasContinue = false;
          }

          if (data?.query?.categorymembers) {
            return (data.query.categorymembers as WikiLookup[]).map((d) => d.title);
          }
        });
      if (newMembers) members.push(...newMembers);
    }

    return members;
  }

  /**
   * Swiss army knife command to get a card's data. It accepts a name, alias, or jp name along with an optional rarity
   * @param cardReqMsg '<Name|Alias|JPName> [rarity#]'
   */
  public static async getCard(cardReqMsg: string): Promise<Card | undefined> {
    if (cardReqMsg.length === 0) return;
    if (!Wiki.indexByJPName || !Wiki.indexByNormalizedName) return;

    // Parse requested name and rarity
    const parsedNameAndRarity = parseCardReqMsg(cardReqMsg, false);
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
    if (slashColor) {
      name = name.split('/')[0] + '/' + titleCase(slashColor);
    }

    if (Wiki.isJP(name)) {
      const indexData = Wiki.indexByJPName.get(name);
      if (indexData && indexData.name) {
        name = indexData.name;
      } else {
        const potentialName = await Wiki.getCharName(name);
        if (potentialName) {
          name = potentialName;
        } else {
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

    const card = await (async function (): Promise<Card | undefined> {
      if (
        indexData &&
        indexData.id &&
        indexData.id !== '0000' &&
        indexData.name &&
        indexData.linkName &&
        indexData.rarestid
      ) {
        // Gemini Saga exception
        if (cardReqMsg.toLowerCase().includes('evil') && indexData.id === '4362' && rarity === '6') {
          indexData.id = '5362';
        } else if (cardReqMsg.toLowerCase().includes('divine') && indexData.id === '5362' && rarity === '6') {
          indexData.id = '4362';
        }

        const fullCardID = rarity ? getFullCardID(indexData.id, rarity) : indexData.rarestid;
        // Try to retrieve card page from wiki.
        const rawText = await Wiki.getRawCardData(fullCardID);
        if (!rawText) {
          return;
        }

        const cardData = await parseTemplateText(rawText);
        return cardData;
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
          return;
        }

        let charID = await Wiki.getCharID(name);
        // Gemini Saga exception
        if (cardReqMsg.toLowerCase().includes('evil') && charID === '4362') {
          charID = '5362';
        } else if (cardReqMsg.toLowerCase().includes('divine') && charID === '5362') {
          charID = '4362';
        }

        if (!charID) return;

        // I should refactor getCharRarities to not include the star.
        const rarities = await (await Wiki.getCharRarities(name.replace(/\s/g, '_'))).map((rarity) =>
          rarity.replace(/★/g, ''),
        );

        const fullCardID = rarity
          ? getFullCardID(charID, rarity)
          : getFullCardID(charID, rarities[rarities.length - 1]);

        const rawText = await Wiki.getRawCardData(fullCardID);
        if (!rawText) {
          return;
        }

        const cardData = await parseTemplateText(rawText);
        return cardData;
      }
    })();

    return card;
  }

  /**
   * Discord's Markdown parser on mobile doesn't play nicely with nested parantheses, so replace them with their
   * URI versions. encodeURI() can't be used for this because it ignores parentheses.
   * @param str URL
   */
  public static encodeSafeURL(str: string): string {
    return str.replace(/\s/g, '_').replace('(', '%28').replace(')', '%29');
  }
}

export { IndexData, TitleResult, EventData, Wiki };
