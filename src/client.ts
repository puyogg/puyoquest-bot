import * as Discord from 'discord.js';
import { commands } from './command-info';
import { initCron } from './cron';

/** CHECK ENVIRONMENT VARIABLES */
// Check if BOT_TOKEN is available
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw 'BOT TOKEN environment variable is missing.';
// Check if BOT_PREFIX is available
const BOT_PREFIX = process.env.BOT_PREFIX;
if (!BOT_PREFIX) throw 'BOT PREFIX environment variable is missing.';

/** SET UP DISCORD CLIENT */
const client = new Discord.Client();

// Cooldowns
const cooldowns = new Discord.Collection<string, Discord.Collection<string, number>>();

// Message handling
client.on('message', (message) => {
  // // Check if in development mode
  // const devmode = process.env.NODE_ENV;

  // Check if message starts with bot prefix. Don't listen to any messages from bots.
  if (!message.content.startsWith(BOT_PREFIX) || message.author.bot) return;

  // // Show user's message if dev mode is on
  // if (devmode) console.log(message.author.username, message.content);

  // Split into arguments
  // const args = message.content.slice(BOT_PREFIX.length).trim().split(/[ ]+/);
  const args = message.content.trim().split(/[ ]+/);

  // Make the command case insensitive
  const firstArg = args.shift();
  if (!firstArg) return;
  const commandName = firstArg.toLowerCase();

  // Get base command from in-memory command list
  const command =
    commands.get(commandName.slice(1)) ||
    commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName.slice(1)));
  // if (devmode) console.log(command);

  // Stop if command is undefined
  if (!command) return;

  // Cooldowns
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 0.5) * 1000;

  if (timestamps) {
    if (timestamps.has(message.author.id)) {
      const timestamp = timestamps.get(message.author.id);
      if (timestamp) {
        const expirationTime = timestamp + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply(
            `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`,
          );
        }
      }
    } else {
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }
  }

  // Try using the command
  try {
    command.execute(message, args);
  } catch (e) {
    console.error(e);
    message.channel.send('Error: View console log for more details.');
  }
});

// Console message to send if bot logged in successfully
client.once('ready', () => {
  console.log('Bot ready!');
  console.log('Starting cron jobs');
  initCron();
});

// Go back to index.ts to log the bot in
export { client, BOT_TOKEN };
