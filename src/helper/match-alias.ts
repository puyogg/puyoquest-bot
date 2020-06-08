import { db } from '../db';

interface AliasData {
  nick_name: string;
  full_name: string;
}

async function getNameFromAlias(alias: string): Promise<string | null> {
  const nickName: string | null = await db
    .one(`SELECT * FROM aliases WHERE nick_name = $1`, [alias])
    .then((data: AliasData) => data['full_name'])
    .catch(() => null);

  return nickName;
}

async function getAliasesFromName(name: string): Promise<string[] | null> {
  const aliasName: string[] | null = await db
    .any(`SELECT * FROM aliases WHERE full_name = $1`, [name])
    .then((data: AliasData[]) => data.map((d) => d.nick_name))
    .catch(() => null);

  return aliasName;
}

async function getAliasDataForAlias(alias: string): Promise<AliasData | null> {
  const aliasData: AliasData | null = await db
    .one(`SELECT * FROM aliases WHERE nick_name = $1`, [alias])
    .then((data: AliasData) => data)
    .catch(() => null);

  return aliasData;
}

async function getAliasDataForName(name: string): Promise<AliasData[] | null> {
  const allAliasData: AliasData[] | null = await db
    .any(`SELECT * FROM aliases WHERE full_name = $1`, [name])
    .then((data: AliasData[]) => data)
    .catch(() => null);

  return allAliasData;
}

export { getNameFromAlias, getAliasesFromName, getAliasDataForAlias, getAliasDataForName };
