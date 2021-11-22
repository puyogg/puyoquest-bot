import { Wiki } from '../wiki/api';
// import { News } from './ppq-news';
import * as indexCache from '../index-cache.json';
// import { client } from '../client';
import * as fs from 'fs';

async function initCron(): Promise<void> {
  // // what emojis are on EPPC?
  // const emojis = Array.from(client.emojis.cache.entries());
  // const emojiData = emojis
  //   .map((emoji) => {
  //     return {
  //       id: emoji[1].id,
  //       name: emoji[1].name,
  //       guild: emoji[1].guild.name,
  //       text: `<:${emoji[1].name}:${emoji[1].id}>`,
  //     };
  //   })
  //   .filter((emoji) => emoji.guild === 'English Puyo Puyo Community' && emoji.name === 'fatigue');
  // console.log(emojiData);

  if (process.env.NODE_ENV === 'production') {
    // Rebuild card index every 24 hours or on boot.
    (async function buildCardIndex(): Promise<void> {
      console.log('Building live card index...');
      await Wiki.buildCardIndex().catch((e) => console.error(e));
      console.log('Finished building card index.');
      setTimeout(buildCardIndex, 86400000);
    })();
  } else {
    console.log('Building card index from cache...');
    Wiki.buildCardIndexFromCache(indexCache);
    console.log('Finished building card index from cache.');

    // await Wiki.buildCardIndex();
    // try {
    //   fs.writeFileSync('./src/index-cache.json', JSON.stringify(Wiki.cardIndex));
    //   console.log('Wrote cache to file.');
    // } catch (e) {
    //   console.error(e);
    // }
  }
}

export { initCron };
