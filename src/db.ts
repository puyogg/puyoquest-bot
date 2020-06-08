import * as pgPromise from 'pg-promise';
import * as fs from 'fs';
import * as path from 'path';
const pgp = pgPromise();

// Check if db url is available
const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined) throw "Couldn't find the database url";

/** SET UP DB OBJECT */
const db = pgp(connectionString);

async function initializeTables(): Promise<void> {
  // Read in init.sql
  let sql = fs
    .readFileSync(path.resolve(__dirname, './sql/init.sql'))
    .toString()
    .replace(/[\r|\n|\t]+/g, ' ')
    .split(';');
  sql.forEach((query, i) => (sql[i] = query.trim().replace(/\s\s+/g, ' ')));
  sql = sql.filter((query) => query.length > 1);

  db.tx(async (t) => {
    for (let i = 0; i < sql.length; i++) {
      // console.log('Query: ', sql[i] + ';');
      await t.none(sql[i] + ';');
    }
  })
    .then(() => {
      console.log('Tables ready.');
    })
    .catch((error) => {
      console.error(error);
    });
}

// initializeTables won't be run yet.
// First, index.ts will confirm that both the bot
// and the database connection work.
export { db, initializeTables };
