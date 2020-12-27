import { Wiki } from './api';
import { wikiTextToEmoji } from './text-to-emoji';
import * as htmlToText from 'html-to-text';
import { titleCase } from 'title-case';
import fetch from 'node-fetch';

interface Card {
  [key: string]: string;
  name: string; // Card Name
  rarity: string; // Star
  code: string; // fullCardID
  link: string;
  jpname: string;
  color: string;
  type1: string; // Attack / Balance / Recovery / HP
  type2: string; // Single Target / Multi-target
  maxlv: string;
  cost: string;
  hpmax: string;
  atkmax: string;
  rcvmax: string;
  as: string; // Active skill name
  jpas: string; // JP Active skill name
  asn: string; // Puyo to skill
  asfn: string; // Puyo to skill for full power
  aslv: string; // Active Skill Level
  ase: string; // Active skill explanation
  asfe: string; // Full power skill explanation
  ast: string;
  astn: string; // Special Training Skill activation number
  aste: string; // Special Training Skill explanation
  ast2: string;
  ast2n: string;
  ast2e: string;
  ast3: string;
  ast3n: string;
  ast3e: string;
  jpast: string; // JP training skill name. Usually just * except for Powerpro-kun
  jpast2: string;
  jpast3: string;
  ls: string; // leader skill name
  lslv: string; // Leader skill level
  lse: string; // Leader skill level
  lste: string; // SP Leader Skill
  jpls: string; // JP Leader skill name
  jplst: string;
  jplst2: string;
  jplst3: string;
  bs: string;
  jpbs: string;
  bslv: string;
  bsn: string;
  bse: string;
  ca: string; // Cross Ability
  jpca: string;
  calv: string;
  can: string;
  cae: string;
  combin1: string;
  combin2: string;
  combin3: string;
  combin4: string;
  combin5: string;
  ss: string;
  jpss: string;
  sslv: string;
  ssstart: string;
  ssend: string;
  sse: string;
}

interface BackAST {
  [key: string]: string;
  ast: string;
  astn: string;
  aste: string;
  ast2: string;
  ast2n: string;
  ast2e: string;
  ast3: string;
  ast3n: string;
  ast3e: string;
  jpast: string;
  jpast2: string;
  jpast3: string;
}

interface BackLST {
  [key: string]: string;
  lst: string;
  lste: string;
  lst2: string;
  lst2e: string;
  lst3: string;
  lst3e: string;
  jplst: string;
  jplst2: string;
  jplst3: string;
}

interface CharacterQuote {
  jp: string;
  en: string;
}

interface CharacterLore {
  [key: string]: string | CharacterQuote[];
  name: string;
  jpname: string;
  descriptionJP: string;
  descriptionEN: string;
  translator: string;
  quotes: CharacterQuote[];
}

interface TransformData {
  rarity: string;
  hsfrom: string;
  hsto: string;
  hs1: string;
  hs2: string;
  hs3: string;
  hs4: string;
  hs5: string;
}

function getFullCardID(charID: string, rarity: string): string {
  // Gemini Saga exception
  if (charID === '4362') {
    if (rarity === '6-1') {
      return '536206';
    } else if (rarity === '6-2') {
      return '436206';
    }
  }
  if (charID === '5362') return '536206';

  // Amitie (w/o Bracelet) exception
  if (charID === '1843') return '184362';

  const has6S = /s|S|-/g.test(rarity);
  if (has6S && rarity.endsWith('2')) {
    return `${charID}1${rarity[0]}`;
  } else {
    return `${charID}0${rarity[0]}`;
  }
}

/**
 * Get keyed values from card templates.
 * For an example, see https://puyonexus.com/wiki/Template:229907?action=raw
 */
function getCardTemplateValue(data: string[], inputKey: string, fullRowKey = false): string {
  const key = `|${inputKey}=`;
  const row = data.find((text) => text.includes(key));

  if (!row) return '';

  const value = row.slice(row.indexOf(key) + key.length);
  if (value.indexOf('|') === -1 || fullRowKey) {
    return value;
  } else {
    return value.slice(0, value.indexOf('|'));
  }
}

/**
 * Get data from more generic templates
 * @param data
 * @param inputKey
 */
function getTemplateValue(data: string, inputKey: string): string {
  const key = `|${inputKey}=`;

  if (!data.includes(key)) {
    return '';
  }

  const value = data.trim().slice(data.indexOf(key) + key.length);

  const lineInd = value.indexOf('|') === -1 ? 9999 : value.indexOf('|');
  const breakInd = value.indexOf('\n') === -1 ? 9999 : value.indexOf('\n');

  if (lineInd === 9999 && breakInd === 9999) {
    // Very end of the data string.
    return value.slice(0, value.length - 2);
  } else if (lineInd < breakInd) {
    return value.slice(0, lineInd);
  } else if (breakInd < lineInd) {
    return value.slice(0, breakInd);
  }

  return '';
}

/**
 * Some skill descriptions use templated text instead of being written out for every character.
 * Another request has to be made using this function to parse the wikitext.
 */
async function parseSkillText(text: string): Promise<string> {
  const url = Wiki.url({
    action: 'parse',
    format: 'json',
    text: text,
    contentmodel: 'wikitext',
  });
  let wikitext = await fetch(url)
    .then((res) => res.json())
    .then((data) => {
      // console.log(data.parse.text);
      return htmlToText.fromString(data.parse.text['*'], { wordwrap: 999 });
    })
    .catch(() => 'Unable to reach the wiki.');

  // Check for strings that need to be replaced
  const strs = Object.keys(wikiTextToEmoji);

  wikitext = wikitext.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  wikitext = wikitext.replace(/(?<= \[\/wiki\/Category:PPQ:).*?(?=_Combination])/g, '');
  wikitext = wikitext.replace(/ \[\/wiki\/Category\:PPQ\:\_Combination\]/g, '');
  wikitext = wikitext.replace(/(?<=\[).*?(?=])/g, '');

  for (let i = 0; i < strs.length; i++) {
    if (!wikitext.includes('[')) return wikitext;
    const str = strs[i];
    wikitext = wikitext.replace(new RegExp(str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'), 'g'), wikiTextToEmoji[str]);
  }

  wikitext = wikitext.replace(/\[\]/g, '');
  return wikitext.trim();
}

/**
 * Pulls the most important card data from card templates.
 * For an example, see https://puyonexus.com/wiki/Template:229907?action=raw
 */
async function parseTemplateText(text: string): Promise<Card> {
  // Ignore first line
  const data = text.slice(text.indexOf('\n'));

  // Split on \n
  const rows = data.split('\n');

  const cardData: Card = {
    name: getCardTemplateValue(rows, 'name'),
    code: getCardTemplateValue(rows, 'code'),
    link: getCardTemplateValue(rows, 'link'),
    rarity: getCardTemplateValue(rows, 'rarity'),
    jpname: getCardTemplateValue(rows, 'jpname'),
    color: getCardTemplateValue(rows, 'color').trim().toLowerCase(),
    type1: getCardTemplateValue(rows, 'type1'),
    type2: getCardTemplateValue(rows, 'type2'),
    maxlv: getCardTemplateValue(rows, 'maxlv'),
    cost: getCardTemplateValue(rows, 'cost'),
    hpmax: getCardTemplateValue(rows, 'hpmax'),
    atkmax: getCardTemplateValue(rows, 'atkmax'),
    rcvmax: getCardTemplateValue(rows, 'rcvmax'),
    as: getCardTemplateValue(rows, 'as'),
    jpas: getCardTemplateValue(rows, 'jpas'),
    asn: getCardTemplateValue(rows, 'asn'),
    asfn: getCardTemplateValue(rows, 'asfn'),
    aslv: getCardTemplateValue(rows, 'aslv'),
    ase: getCardTemplateValue(rows, 'ase', true),
    asfe: getCardTemplateValue(rows, 'asfe', true),
    ast: getCardTemplateValue(rows, 'ast'),
    astn: getCardTemplateValue(rows, 'astn'),
    aste: getCardTemplateValue(rows, 'aste', true),
    ast2: getCardTemplateValue(rows, 'ast2'),
    ast2n: getCardTemplateValue(rows, 'ast2n'),
    ast2e: getCardTemplateValue(rows, 'ast2e', true),
    ast3: getCardTemplateValue(rows, 'ast3'),
    ast3n: getCardTemplateValue(rows, 'ast3n'),
    ast3e: getCardTemplateValue(rows, 'ast3e', true),
    jpast: getCardTemplateValue(rows, 'jpast'),
    jpast2: getCardTemplateValue(rows, 'jpast2'),
    jpast3: getCardTemplateValue(rows, 'jpast3'),
    ls: getCardTemplateValue(rows, 'ls'),
    lslv: getCardTemplateValue(rows, 'lslv'),
    lse: getCardTemplateValue(rows, 'lse', true),
    lst: getCardTemplateValue(rows, 'lst'),
    lste: getCardTemplateValue(rows, 'lste', true),
    lst2: getCardTemplateValue(rows, 'lst2'),
    lst2e: getCardTemplateValue(rows, 'lst2e', true),
    lst3: getCardTemplateValue(rows, 'lst3'),
    lst3e: getCardTemplateValue(rows, 'lst3e', true),
    jpls: getCardTemplateValue(rows, 'jpls'),
    jplst: getCardTemplateValue(rows, 'jplst'),
    jplst2: getCardTemplateValue(rows, 'jplst2'),
    jplst3: getCardTemplateValue(rows, 'jplst3'),
    bs: getCardTemplateValue(rows, 'bs'),
    jpbs: getCardTemplateValue(rows, 'jpbs'),
    bslv: getCardTemplateValue(rows, 'bslv'),
    bsn: getCardTemplateValue(rows, 'bsn'),
    bse: getCardTemplateValue(rows, 'bse', true),
    ca: getCardTemplateValue(rows, 'ca'),
    jpca: getCardTemplateValue(rows, 'jpca'),
    calv: getCardTemplateValue(rows, 'calv'),
    can: getCardTemplateValue(rows, 'can'),
    cae: getCardTemplateValue(rows, 'cae', true),
    combin1: getCardTemplateValue(rows, 'combin1', true),
    combin2: getCardTemplateValue(rows, 'combin2', true),
    combin3: getCardTemplateValue(rows, 'combin3', true),
    combin4: getCardTemplateValue(rows, 'combin4', true),
    combin5: getCardTemplateValue(rows, 'combin5', true),
    ss: getCardTemplateValue(rows, 'ss'),
    jpss: getCardTemplateValue(rows, 'jpss'),
    sslv: getCardTemplateValue(rows, 'sslv'),
    ssstart: getCardTemplateValue(rows, 'ssstart'),
    ssend: getCardTemplateValue(rows, 'ssend'),
    sse: getCardTemplateValue(rows, 'sse', true),
  };

  // Check for backast (Powerpro-kun)
  const backASTData = await (async function (): Promise<BackAST | undefined> {
    const backast = getCardTemplateValue(rows, 'backast');

    if (!backast) return;

    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${backast}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    if (!rawText) return;

    const d = rawText.slice(rawText.indexOf('\n'));
    const r = d.split('\n');

    return {
      astn: getCardTemplateValue(r, 'astn'),
      ast: getCardTemplateValue(r, 'ast'),
      aste: getCardTemplateValue(r, 'aste', true),
      ast2: getCardTemplateValue(r, 'ast2'),
      ast2n: getCardTemplateValue(r, 'ast2n'),
      ast2e: getCardTemplateValue(r, 'ast2e', true),
      ast3: getCardTemplateValue(r, 'ast3'),
      ast3n: getCardTemplateValue(r, 'ast3n'),
      ast3e: getCardTemplateValue(r, 'ast3e', true),
      jpast: getCardTemplateValue(r, 'jpast'),
      jpast2: getCardTemplateValue(r, 'jpast2'),
      jpast3: getCardTemplateValue(r, 'jpast3'),
    };
  })();

  // Check for backlst (Powerpro-kun)
  const backLSTData = await (async function (): Promise<BackLST | undefined> {
    const backlst = getCardTemplateValue(rows, 'backlst');

    if (!backlst) return;

    const rawText = await fetch(`https://puyonexus.com/wiki/Template:${backlst}?action=raw`)
      .then((res) => {
        if (res.status === 200) {
          return res.text();
        }
      })
      .then((data) => data);

    if (!rawText) return;

    const d = rawText.slice(rawText.indexOf('\n'));
    const r = d.split('\n');

    return {
      lst: getCardTemplateValue(r, 'lst'),
      lste: getCardTemplateValue(r, 'lste', true),
      lst2: getCardTemplateValue(r, 'lst2'),
      lst2e: getCardTemplateValue(r, 'lst2e', true),
      lst3: getCardTemplateValue(r, 'lst3'),
      lst3e: getCardTemplateValue(r, 'lst3e', true),
      jplst: getCardTemplateValue(r, 'jplst'),
      jplst2: getCardTemplateValue(r, 'jplst2'),
      jplst3: getCardTemplateValue(r, 'jplst3'),
    };
  })();

  if (backASTData) {
    Object.keys(backASTData).forEach((key) => {
      if (backASTData[key]) {
        cardData[key] = backASTData[key];
      }
    });
  }

  if (backLSTData) {
    Object.keys(backLSTData).forEach((key) => {
      if (backLSTData[key]) {
        cardData[key] = backLSTData[key];
      }
    });
  }

  // Parse wiki text of ase, lse, and bse
  if (cardData.ase) cardData.ase = await parseSkillText(cardData.ase);
  if (cardData.asfe) cardData.asfe = await parseSkillText(cardData.asfe);
  if (cardData.aste) cardData.aste = await parseSkillText(cardData.aste);
  if (cardData.ast2e) cardData.ast2e = await parseSkillText(cardData.ast2e);
  if (cardData.ast3e) cardData.ast3e = await parseSkillText(cardData.ast3e);
  if (cardData.lse) cardData.lse = await parseSkillText(cardData.lse);
  if (cardData.lste) cardData.lste = await parseSkillText(cardData.lste);
  if (cardData.lst2e) cardData.lst2e = await parseSkillText(cardData.lst2e);
  if (cardData.lst3e) cardData.lst3e = await parseSkillText(cardData.lst3e);
  if (cardData.bse) cardData.bse = await parseSkillText(cardData.bse);
  if (cardData.sse) cardData.sse = await parseSkillText(cardData.sse);
  if (cardData.cae) cardData.cae = await parseSkillText(cardData.cae);

  return cardData;
}

interface TitleCasingExceptions {
  [key: string]: string;
}
const titleCasingExceptions: TitleCasingExceptions = {
  'Ver.': 'ver.',
  Puyotet: 'PuyoTet',
  Puyochron: 'PuyoChron',
  'Make up': 'Make Up',
  ' Hw': ' HW',
  'ver.hw': 'ver.HW',
  'Eva ': 'EVA ',
  Iii: 'III', // Draude III
  'the Movie': 'The Movie', // Sonic ver. The Movie
  '/red': '/Red',
  '/blue': '/Blue',
  '/green': '/Green',
  '/yellow': '/Yellow',
  '/purple': '/Purple',
  npc: 'NPC',
  'W/o': 'w/o',
  Snowprincess: 'SnowPrincess',
  ' No ': ' no ',
};

function normalizeTitle(inputName: string): string {
  let name = inputName.trim();

  // All to lowercase
  name = name.toLowerCase();

  // Title casing name
  name = titleCase(name);

  Object.keys(titleCasingExceptions).forEach((key) => {
    name = name.replace(key, titleCasingExceptions[key]);
  });

  // Dash with honorifics
  name = name.replace(/-[a-zA-Z]/g, (str) => str.toLowerCase());

  return name;
}

function parseCardReqMsg(message: string, isCommand = true): [string, string | null] {
  // Reduce whitespace between any words down to 1 space.
  let msg = message.trim().replace(/\s\s+/g, ' ');

  // Remove command name
  if (isCommand) {
    msg = msg.slice(msg.indexOf(' ') + 1);
  }

  // Normalize titles
  msg = normalizeTitle(msg);

  // Check if the last character is a number preceeded by a space.
  // That's the rarity number.
  // const hasRarity = /\s+(?=\d)/.test(msg.slice(msg.length - 2, msg.length));
  // const hasRarity = (function (): boolean {
  //   const split = msg.split(' ');
  //   if (/^\d+$/.test(split[split.length - 1].replace(/-|s|S/g, ''))) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // })();

  const hasRarity = (function (): boolean {
    const split = msg.split(' ');
    const last = split[split.length - 1];
    if (last === '24') return false; // Exception for Schezo ver. Division 24
    return /^\d+$/.test(split[split.length - 1].replace(/-|s|S/g, ''));
  })();

  if (hasRarity) {
    const split = msg.split(' ');
    const rarity = split[split.length - 1];
    const name = split.slice(0, split.length - 1).join(' ');

    return [name, rarity];
  } else {
    const name = msg;
    return [name, null];
  }
}

function parseCardAliasReq(message: string): [string] | [string, string] {
  let msg = message.trim().replace(/\s\s+/g, ' ');

  // Remove command name
  msg = msg.slice(msg.indexOf(' ') + 1);

  // Normalize titles
  msg = normalizeTitle(msg);

  const split = msg.replace(/\s\s+/g, ' ').split('>>');
  const nickName = split[0].toLowerCase().trim();
  if (split.length === 1) {
    return [nickName];
  }
  const wikiName = normalizeTitle(split[1]).trim();
  return [nickName, wikiName];
}

async function parseLoreTemplate(text: string): Promise<CharacterLore> {
  const rows = text.split('\n');
  const loreData: CharacterLore = {
    name: getCardTemplateValue(rows, 'name'),
    jpname: getCardTemplateValue(rows, 'jpname'),
    descriptionJP: getCardTemplateValue(rows, 'ft', true),
    descriptionEN: getCardTemplateValue(rows, 'fta', true),
    translator: getCardTemplateValue(rows, 'ftc', true),
    quotes: [
      {
        jp: getCardTemplateValue(rows, 'ft1', true),
        en: getCardTemplateValue(rows, 'fta1', true),
      },
      {
        jp: getCardTemplateValue(rows, 'ft2', true),
        en: getCardTemplateValue(rows, 'fta2', true),
      },
      {
        jp: getCardTemplateValue(rows, 'ft3', true),
        en: getCardTemplateValue(rows, 'fta3', true),
      },
    ],
  };

  if (loreData.descriptionEN) loreData.descriptionEN = await parseSkillText(loreData.descriptionEN);
  if (loreData.translator) loreData.translator = await parseSkillText(loreData.translator);
  if (loreData.quotes[0].en) loreData.quotes[0].en = await parseSkillText(loreData.quotes[0].en);
  if (loreData.quotes[1].en) loreData.quotes[1].en = await parseSkillText(loreData.quotes[1].en);
  if (loreData.quotes[2].en) loreData.quotes[2].en = await parseSkillText(loreData.quotes[2].en);

  return loreData;
}

async function parseTransformTemplate(text: string): Promise<TransformData> {
  let rarity = getTemplateValue(text, 'link');
  if (rarity) {
    rarity = rarity.slice(rarity.indexOf('/★') + '/★'.length);
  } else {
    rarity = getTemplateValue(text, 'rarity');
  }

  const transformData: TransformData = {
    rarity: rarity,
    hsfrom: getTemplateValue(text, 'hsfrom'),
    hsto: getTemplateValue(text, 'hsto'),
    hs1: getTemplateValue(text, 'hs1'),
    hs2: getTemplateValue(text, 'hs2'),
    hs3: getTemplateValue(text, 'hs3'),
    hs4: getTemplateValue(text, 'hs4'),
    hs5: getTemplateValue(text, 'hs5'),
  };

  return transformData;
}

export {
  Card,
  getFullCardID,
  getTemplateValue,
  normalizeTitle,
  parseCardAliasReq,
  parseTemplateText,
  parseCardReqMsg,
  parseLoreTemplate,
  parseTransformTemplate,
};
