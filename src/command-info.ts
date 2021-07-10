import * as fs from 'fs';
import * as path from 'path';
import * as Discord from 'discord.js';

type Category = 'utility' | 'moderation' | 'administration' | 'puyoquest';

interface Command {
  name: string;
  description: string;
  args: boolean;
  aliases: string[];
  category: Category[];
  usage: string[];
  subCommands?: Discord.Collection<string, Command>;
  cooldown?: number;
  execute(message?: Discord.Message, args?: string[]): void;
}

// Recursively build command tree, and populate the subCommand property on Command objects.
function getCommands(dirPath: string): Discord.Collection<string, Command> {
  const cmdMap = new Discord.Collection<string, Command>();
  const cmdFiles = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .filter((dirent) => dirent.name.endsWith('.ts') || dirent.name.endsWith('.js'))
    .map((dirent) => dirPath + `/${dirent.name}`);

  cmdFiles.forEach((cmdFile) => {
    const cmd = require(cmdFile).default as Command;
    const name = cmd.name;

    // There shouldn't be naming collisions since cmd.name is supposed to be the same
    // as the filename... but just in case.
    if (cmdMap.has(name)) {
      throw `Error. Naming collision for command: ${name}`;
    }

    const subDirPath = dirPath + `/${name}`;
    if (fs.existsSync(subDirPath)) {
      cmd.subCommands = getCommands(subDirPath);
    }

    cmdMap.set(name, cmd);
  });

  return cmdMap;
}

const commands = getCommands(path.resolve(__dirname, './commands'));

export { Command, commands };
