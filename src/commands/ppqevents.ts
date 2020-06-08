import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki, EventData } from '../wiki/api';
import { DateTime } from 'luxon';

// Retrieve command name from filename
const name = path.parse(__filename).name;

function parseTime(timeStr: string): DateTime {
  const [year, month, day] = timeStr
    .split(' ')[0]
    .split('/')
    .map((num) => parseInt(num, 10));
  const [hour, minute] = timeStr
    .split(' ')[1]
    .split(':')
    .map((num) => parseInt(num, 10));

  const time = DateTime.fromObject({
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    zone: 'Asia/Tokyo',
  });

  return time;
}

function showRemaining(end: DateTime): string {
  const diff = end.diffNow(['days', 'hours']);
  let days = 0;
  let hours = 0;
  // console.log(diff.days, diff.hours);
  if (diff.hours < 0) {
    days = Math.floor(diff.days + diff.hours / 24);
    hours = Math.floor(24 + diff.hours);
  } else {
    days = Math.floor(diff.days);
    hours = Math.floor(diff.hours);
  }
  return `${days}d ${hours}h`;
}

function parseEndTime(event: EventData): DateTime {
  const [yearEnd, monthEnd, dayEnd] = event.end
    .split(' ')[0]
    .split('/')
    .map((num) => parseInt(num, 10));
  const [hourEnd, minuteEnd] = event.end
    .split(' ')[1]
    .split(':')
    .map((num) => parseInt(num, 10));

  const endTime = DateTime.fromObject({
    year: yearEnd,
    month: monthEnd,
    day: dayEnd,
    hour: hourEnd,
    minute: minuteEnd,
    zone: 'Asia/Tokyo',
  });

  return endTime;
}

export default {
  name: name, // stats
  usage: ['!ppqevents'],
  description: 'Show statistical information of the server',
  args: false,
  aliases: [],
  category: ['utility'],
  async execute(message: Discord.Message): Promise<void> {
    const events = await Wiki.getTimedEvents();
    if (!events) {
      message.channel.send(`Error: Couldn't get the list of events.`);
      return;
    }

    // Sort events by the ones ending soonest
    // events.sort((a, b) => parseEndTime(a).toMillis() - parseEndTime(b).toMillis());

    const time = DateTime.fromObject({ zone: 'Asia/Tokyo' });

    const ongoingEvents = events.filter((event) => {
      const startTime = parseTime(event.start);
      return startTime <= time;
    });

    const upcomingEvents = events.filter((event) => {
      const startTime = parseTime(event.start);
      return startTime > time;
    });

    const em = new Discord.MessageEmbed();
    em.setTitle(`Timed events for ${time.monthLong} ${time.year}`);

    ongoingEvents.sort((a, b) => parseTime(a.end).toMillis() - parseTime(b.end).toMillis());
    let ongoing = '';
    ongoingEvents.forEach((event) => {
      const endTime = parseTime(event.end);
      const diffHours = endTime.diff(time, 'hours').toObject()['hours'];
      if (diffHours === undefined) return;
      ongoing += `•${diffHours < 24 ? '🚨' : ''}**${event.name} (${event.jpname})**: Ends in ${showRemaining(
        endTime,
      )}\n`;
    });

    upcomingEvents.sort((a, b) => parseTime(a.start).toMillis() - parseTime(b.start).toMillis());
    let upcoming = '';
    upcomingEvents.forEach((event) => {
      const startTime = parseTime(event.start);
      const diffHours = startTime.diff(time, 'hours').toObject()['hours'];
      if (diffHours === undefined) return;
      upcoming += `•${diffHours < 24 ? '🔔' : ''}**${event.name} (${event.jpname})**: Starts in ${showRemaining(
        startTime,
      )}\n`;
      // upcoming += `Ends: ${event.end}\n\n`;
    });

    em.setDescription(
      `This list was generated at: ${time.year}/${time.month}/${time.day} ${time.hour}:${time.minute} JST`,
    );
    em.addField('Ongoing Events', ongoing);
    em.addField('Upcoming Events', upcoming);
    em.setURL(`https://puyonexus.com/wiki/PPQ:Event_News_Archive/${time.monthLong}_${time.year}`);
    message.channel.send(em);
  },
} as Command;
