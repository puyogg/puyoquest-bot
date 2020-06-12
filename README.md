## Command List

| Command          | Alias | Usage                         | Description                                                                                        |
|------------------|-------|-------------------------------|----------------------------------------------------------------------------------------------------|
| ?card            | ?c    | ?c  [rarity#]                 | Get a card's rarities, or supply a rarity to get full details.                                     |
| ?fullart         | ?fa   | ?fa  [rarity#]                | Request a card's full body art. Includes any asymmetrical and Full Power art.                      |
| ?alias           | ?a    | ?a AliasName >> CharacterName | Alias a name to a character. Only usable on the EPPC Discord.                                      |
| ?aliaslist       | ?al   | ?al [alias\|name]             | View the aliases available for a character.                                                        |
| ?aliasdelete     | ?ad   | ?ad [alias]                   | Remove an alias. Only usable on the EPPC Discord.                                                  |
| ?namethatcard    | ?ntc  | ?ntc                          | Play "Name that card!".                                                                            |
| ?ntc-leaderboard | ?ntcl | ?ntcl                         | List the top 10 ntc players on the server.                                                         |
| ?page            | ?p    | ?p [pageName]                 | Get a link to the Puyo Quest wiki. If page title is supplied, the bot will link to the PPQ Portal. |
| ?pageseries      | ?ps   | ?ps [pageSeries]              | Get a link to a card series.                                                                       |

## Planned Features

* Group reminders
* Card combination look up
* Card Recognition? Check out TensorFlow

## Notes for myself... 
### Backing up PostgreSQL Database
* Backing up PostgreSQL while it's running in a container.
```bash
docker exec yotarou-bot_postgres_1 pg_dump -U <POSTGRES_USERNAME> <DATABASE_NAME> > backup.sql
```
The `backup.sql` file is saved outside of the container.

* Restoring:
```bash
docker exec -i <postgres_container_name> psql -U <POSTGRES_USERNAME> -d <DATABASE_NAME> < backup.sql
```