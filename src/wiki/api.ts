import fetch from 'node-fetch';
import * as Discord from 'discord.js';
import { getTemplateValue } from './parser';
import * as leven from 'leven';
import { DateTime } from 'luxon';
import { db } from '../db';

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
    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${charID}?action=raw`)
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

    if (cards.includes('16')) {
      cards.forEach((card, i) => {
        if (card === '06') {
          cards[i] = '6-1';
        } else if (card === '16') {
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

    const imageURLs: string[] = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const results: TitleResult[] = data.query.pages[Object.keys(data.query?.pages)[0]].images;
        return results.map((result) => result.title).filter((name) => name.includes(charID));
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

  // public static async buildCardIndex(): Promise<void> {
  //   const indexPage = [
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/1',
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/2',
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/3',
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/4',
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/5',
  //     'https://puyonexus.com/wiki/PPQ:Card_Index/NPC',
  //   ];

  //   // Get list of all IDs
  //   const charIDs: string[] = [];
  //   for (const url of indexPage) {
  //     const page = await fetch(`${url}?action=raw`)
  //       .then((res) => {
  //         if (res.status === 200) return res.text();
  //       })
  //       .then((data) => data)
  //       .catch((e) => console.error(e));

  //     if (!page) {
  //       console.log(`Error accessing page: `, url);
  //       return;
  //     }

  //     const IDs = page
  //       .split('\n')
  //       .filter((row) => row.startsWith('| {{'))
  //       .map((row) => row.replace(/index2|{|}|\||\s+/g, ''));

  //     charIDs.push(...IDs);
  //   }

  //   // Save list to Wiki class
  //   console.log('Saved card index list');
  //   Wiki.indexList = charIDs;
  // }

  public static async buildCardIndex(): Promise<void> {
    const indexPage = [
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/1',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/2',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/3',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/4',
      'https://puyonexus.com/wiki/PPQ:Card_Index/By_Number/5',
      'https://puyonexus.com/wiki/PPQ:Card_Index/NPC',
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
  //   // Check if the indexList has been built recently
  //   if (!Wiki.indexList) await Wiki.buildCardIndex().catch((e) => console.error(e));

  //   // Check again if the indexList has been made.
  //   if (!Wiki.indexList) {
  //     console.log('Error. Failed to load card index list.');
  //     return;
  //   }

  //   const attempts = 24;
  //   for (let i = 0; i < attempts; i++) {
  //     const randID = Wiki.indexList[Math.floor(Math.random() * Wiki.indexList.length)];
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
  //       // Remove the invalid ID
  //       const ind = Wiki.indexList.indexOf(randID);
  //       if (ind !== -1) {
  //         Wiki.indexList.splice(Wiki.indexList.indexOf(randID), 1);
  //       }
  //       console.log('Removed invalid ID:', randID);
  //     } else {
  //       return { id: randID, name: name };
  //     }
  //   }

  //   return;
  // }

  public static async getRandomCard(): Promise<{ id: string; name: string } | undefined> {
    if (!Wiki.cardIndex) return;

    const attempts = 24;
    for (let i = 0; i < attempts; i++) {
      const indexData = Wiki.cardIndex[Math.floor(Math.random() * Wiki.cardIndex.length)];
      if (!indexData.id) continue;
      const randID = indexData.id;
      const nameReqURL = `https://puyonexus.com/mediawiki/api.php?action=parse&format=json&text=%7B%7B${randID}%7Cindex2%7D%7D&contentmodel=wikitext`;
      const templateData: string = await fetch(nameReqURL)
        .then((res) => res.json())
        .then((data) => data.parse.text['*']);
      const name = templateData.slice(
        templateData.indexOf('title="') + 'title="'.length,
        templateData.indexOf('">', templateData.indexOf('title="') + 'title="'.length),
      );

      // Check if a valid card was found
      if (name.includes('page does not exist')) {
        continue;
      } else {
        return { id: randID, name: name };
      }
    }
  }

  public static async getFilesOnPage(pageTitle: string): Promise<string[] | null> {
    const url = Wiki.url({
      action: 'query',
      format: 'json',
      prop: 'images',
      titles: pageTitle,
      imlimit: '50',
    });

    const filePages: string[] | null = await fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const results: TitleResult[] = data.query.pages[Object.keys(data.query?.pages)[0]].images;
        return results.map((result) => result.title);
      })
      .catch(() => null);

    return filePages;
  }

  /**
   * @param fullTitle e.g. PPQ:Link_Name/★7
   * @returns Array of full path URLs to the images
   */
  public static async getArtURLsFromPageTitle(pageTitle: string): Promise<FullArtData | undefined> {
    const filePages = await Wiki.getFilesOnPage(pageTitle);
    if (!filePages || filePages.length === 0) return;
    const fullArts = filePages
      .filter((file) => /l\.png|r\.png|ss.png/.test(file))
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

    // const indexOfMax = (arr: number[]): number => {
    //   if (arr.length === 0) {
    //     return -1;
    //   }

    //   let max = arr[0];
    //   let maxIndex = 0;

    //   for (let i = 1; i < arr.length; i++) {
    //     if (arr[i] > max) {
    //       maxIndex = i;
    //       max = arr[i];
    //     }
    //   }

    //   return maxIndex;
    // };

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
    const aliasMax = indexOfMax(aliasProb);

    if (prob[indexMax] < threshold && aliasProb[aliasMax] < threshold) return;
    if (prob[indexMax] >= aliasProb[aliasMax]) {
      const likelyName = Wiki.cardIndex[indexMax].name;
      if (!likelyName) return;
      return likelyName;
    } else {
      const likelyData = Wiki.indexByNormalizedName?.get(
        allAliases[aliasMax].full_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      );
      if (!likelyData || !likelyData.name) return;
      return likelyData.name;
    }
  }

  public static async similaritySearchJP(name: string, threshold = 0.25): Promise<string | undefined> {
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
}

export { TitleResult, EventData, Wiki };
