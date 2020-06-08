import { db, initializeTables } from './db';
import { client, BOT_TOKEN } from './client';

// Check the database connection and log the bot into Discord
db.any('SELECT NOW()')
  .then(async (data) => {
    console.log('Initializing tables.');
    await initializeTables();

    console.log('The current time is : ', data[0]['now']);
    client.login(BOT_TOKEN); // Cron jobs are initiated within ./client, client.on('ready');
  })
  .catch((error) => console.error(error));
