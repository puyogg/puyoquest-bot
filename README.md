# puyoquest-bot

A multi-server Discord bot for [Puyo Puyo Quest](http://puyopuyoquest.sega-net.com/), a Japanese mobile game by SEGA. The bot can retrieve art and character data from the [Puyo Nexus Wiki](https://puyonexus.com/wiki/PPQ:Portal).

[<img src="https://i.imgur.com/jtqI1Fs.png">](https://puyonexus.com/wiki/PPQ:Steam_City_Arle/%E2%98%857)

The bot is written in TypeScript and runs on Node.js, in a Docker container, with a PostgreSQL database to store server settings and a leaderboard.

## Adding the bot to a server

You can add my fork of the bot, "Yotarou", to your server with this link: https://discord.com/oauth2/authorize?client_id=589483071384977447&scope=bot

## Command List

| Command          | Alias    | Usage                             | Description                                                                                                                                  |
| ---------------- | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ?card            | ?c       | ?c <Name                          | JPName                                                                                                                                       | Alias> [rarity#] | Get a card's rarities, or supply a rarity to get full details. |
| ?fullart         | ?fa      | ?fa <Name                         | JPName                                                                                                                                       | Alias> [rarity#] | Request a card's full body art. Includes any asymmetrical and Full Power art. |
| ?alias           | ?a       | ?a AliasName >> CharacterName     | Alias a name to a character. Only usable on the EPPC Discord.                                                                                |
| ?aliaslist       | ?al      | ?al [Alias/Name]                  | View the aliases available for a character.                                                                                                  |
| ?aliasdelete     | ?ad      | ?ad [Alias]                       | Remove an alias. Only usable on the EPPC Discord.                                                                                            |
| ?namethatcard    | ?ntc     | ?ntc                              | Play "Name that card!".                                                                                                                      |
| ?ntc-leaderboard | ?ntcl    | ?ntcl                             | List the top 10 ntc players on the server. Use `?ntcl me` to get your own ranking.                                                           |
| ?page            | ?p       | ?p [PageName]                     | Get a link to the Puyo Quest wiki. If a page title isn't supplied, the bot will link to the PPQ Portal.                                      |
| ?pageseries      | ?ps      | ?ps [PageSeries]                  | Get a link to a card series.                                                                                                                 |
| ?multiquest      | ?mq      | ?mq <RoomCode> [Info] ([Duration]) | Send a clickable link to your multiplayer room.                                                                                              |
| ?questbattle     | ?qb      | ?qb <RoomCode> [Info] ([Duration]) | Send a clickable link to your battle room.                                                                                                   |
| ?ten-roll        | ?tenroll | ?tenroll                          | Combat your gambling addiction.                                                                                                              |
| ?category-search | ?cs      | ?cs <CategoryName> [[color]]      | Get a link to the category page. If you specify a color in square brackets, you'll get an embed with a subset of the characters on the page. |
| ?...             | ?csfancy | ?csfancy <CategoryName> [[color]] | Same as above, but the bot will spend some extra seconds making a nice thumbnail of the relevant card portraits.                             |
| ?deck             | ... | ?deck [[Character Rarity]] | Show an example of a deck by listing out cards. The card name + rarity should be enclosed in square brackets.                             |

## Installing a clone of the bot

### Environment setup

You'll need an `.env` file with these variables:

```bash
# Your Discord Bot's Token.
BOT_TOKEN=ABCD1234...

# Insert your chosen login info for the Postgres DB
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=discordbot

# Prefix to call commands with in chat.
BOT_PREFIX=?
```

Some of the scripts in [package.json](package.json) rely on Unix commands, so I recommend running the project on Linux/macOS or [WSL2](https://docs.microsoft.com/en-us/windows/wsl/about).

### Development mode

```bash
docker-compose build
docker-compose up -d # Run the bot with ts-node
```

### Production mode

```bash
docker-compose build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d # Compile JS & run in node
```

## Planned Features

- Group reminders
- Card combination look up
- Card Recognition? Set this up with TensorFlow?

### Backing up PostgreSQL Database

- Backing up PostgreSQL while it's running in a container.

```bash
docker exec <postgres_container_name> pg_dump -U <POSTGRES_USERNAME> <DATABASE_NAME> > backup.sql
```

The `backup.sql` file is saved outside of the container.

- Restoring:

```bash
docker exec -i <postgres_container_name> psql -U <POSTGRES_USERNAME> -d <DATABASE_NAME> < backup.sql
```
