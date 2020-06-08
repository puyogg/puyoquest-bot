import * as path from 'path';
import { Command } from '../../command-info';

// Retrieve command name from filename
const name = path.parse(__filename).name;

const command: Command = {
  name: name, // server
  usage: ['!admin server'],
  description: 'Show statistical information of the server',
  args: false,
  aliases: [],
  category: ['utility'],
  execute(): void {
    console.log('server');
  },
};

export default command;
