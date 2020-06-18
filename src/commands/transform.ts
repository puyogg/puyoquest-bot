import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { getFullCardID, parseTransformTemplate } from '../wiki/parser';
import { Wiki } from '../wiki/api';

/**
 * 1. Parse message for the full name and rarity change
 *   - (a) Rarity Change - Get last argument and check if it's in #>#, #>#-#, #-#>#-# form
 *     - Split the rarity change string into the firstRarity and secondRarity
 *   - (b) Full Name - join remaining arguments and use normalizeTitle on it
 *
 * 2. Check if the normalized full name matches a valid character.
 *   - (a) Fodder card detection
 *   - (b) Alias database check
 *   - (c) Fodder card fix
 *   - (d) Check if it's a Japanese name
 *   - (e) Try to get card data from the index based on normalized name
 *
 * 3. Get transformation data
 *   - (a) indexData exists?
 *     - (i) Get TransformData for first rarity using Wiki
 *     - (ii) use 'hsto' in TransformData to repeat on next rarity
 *     - (iii) stop when 'hsto' is blank, or the TransformData.rarity matches secondRarity
 */

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // card
  usage: ['transform Alias|Name #>#'],
  description: 't',
  args: true,
  aliases: ['t'],
  category: ['puyoquest'],
  async execute(message: Discord.Message, args: string[]): Promise<void> {
    // console.log(args);
    // // Don't use this command if the bot isn't fully loaded
    // if (!(Wiki.cardIndex && Wiki.indexByID && Wiki.indexByJPName && Wiki.indexByNormalizedName)) return;
    // // Check for a valid message
    // if (args.length === 0) {
    //   message.channel.send(`Error: You didn't supply a card name.`);
    //   return;
    // }
    // // Last argument should be of form #>#, #>#-#, or #-#,#-#
    // const rarityChange = args[args.length - 1];
    // const split = rarityChange.split('>');
    // if (split.length !== 2) {
    //   message.channel.send(`Error: You need to specify the change in rarity with #>#`);
    //   return;
    // }
    // if (!/^\d$/.test(split[0]) && !/^\d-\d$/.test(split[0])) {
    //   message.channel.send(`Error: ${split[0]} isn't a valid rarity.`);
    //   return;
    // }
    // if (!/^\d$/.test(split[1]) && !/^\d-\d$/.test(split[1])) {
    //   message.channel.send(`Error: ${split[1]} isn't a valid rarity.`);
    //   return;
    // }
    // const [firstRarity, secondRarity] = split;
    // console.log('Rarity Change', firstRarity, secondRarity);
    // const fullCardID = '101002';
    // const rarity = '2';
    // // Try to retrieve card page from wiki.
    // const rawText = await Wiki.getRawCardData(fullCardID);
    // if (!rawText) {
    //   message.channel.send(`Error: ${name} is not available in rarity: ★${rarity}`);
    //   return;
    // }
    // const transformData = await parseTransformTemplate(rawText);
    // console.log(transformData);
  },
};

export default command;
