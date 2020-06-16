import * as path from 'path';
import { Command } from '../command-info';
import * as Discord from 'discord.js';
import { parseCardAliasReq } from '../wiki/parser';
import { getAliasDataForAlias, getAliasesFromName } from '../helper/match-alias';
import { Wiki } from '../wiki/api';
import { db } from '../db';
import { getNameFromAlias } from '../helper/match-alias';

// Retrieve command name from filename
const name = path.parse(__filename).name;

export default {
  name: name,
  usage: ['alias <Wiki Name>, <nickname>'],
  description: "Set an alias for a Puyo Quest character's name.",
  args: true,
  aliases: ['a'],
  category: ['puyoquest'],
  async execute(message: Discord.Message): Promise<void> {
    // Only allow aliasing on EPPC, unless we're in dev mode
    if (message.guild?.id !== '133012933260214272' && process.env.NODE_ENV === 'production') {
      message.channel.send('Error: Alias management is only allowed on the EPPC Discord server.');
      return;
    }

    // Get arguments
    const args = parseCardAliasReq(message.content);
    // Check for two arguments
    if (args.length < 2) {
      message.channel.send('Error: Insufficient parameters.');
      return;
    }
    const nickName = args[0].trim();
    let wikiName = args[1]?.trim() as string;

    // Check if nickname already exists in the database
    const nickData = await getAliasDataForAlias(nickName);
    if (nickData) {
      message.channel.send(
        `The alias "${nickData['nick_name']}" is already set for character: ${nickData['full_name']}`,
      );
      return;
    }

    // Update name with English name if the user gave it in Japanese
    if (Wiki.isJP(wikiName)) {
      const jpName = await Wiki.getCharName(wikiName);
      if (jpName) {
        wikiName = jpName;
      } else {
        message.channel.send(`Error: Couldn't find a translation for ${wikiName}`);
        return;
      }
    }

    // Check if the name leads to a redirect. I need to refactor this lmao
    const redirectName = await Wiki.checkCharRedirect(wikiName);
    if (redirectName) {
      if (wikiName !== redirectName) {
        wikiName = redirectName;
      }
    } else {
      // If it's a fodder card, it might have its name at 'name/Red'
      const redirectName = await Wiki.checkCharRedirect(`${wikiName}/Red`);
      if (redirectName) {
        if (wikiName !== redirectName) {
          wikiName = redirectName;
        }
      } else {
        // Maybe the given name is itself an alias...
        const aliasName = await getNameFromAlias(wikiName.toLowerCase());
        if (aliasName) {
          wikiName = aliasName;
        } else {
          message.channel.send(`Error: Couldn't find a card named ${wikiName}`);
          return;
        }
      }
    }

    // Add nickname to db
    await db
      .none(
        `INSERT INTO aliases (nick_name, full_name)
      VALUES ($[nickName], $[wikiName])
      `,
        {
          nickName: nickName.toLowerCase(),
          wikiName: wikiName,
        },
      )
      .then(async () => {
        const aliases = await getAliasesFromName(wikiName);
        message.channel.send(
          `Successfully aliased "${nickName}" to character: ${wikiName}.\nThe character now has the aliases: \`\`\`${aliases?.join(
            ', ',
          )}\`\`\``,
        );
        return;
      });
  },
} as Command;
