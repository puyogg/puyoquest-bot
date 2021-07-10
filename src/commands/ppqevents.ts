import * as path from 'path';
import * as Discord from 'discord.js';
import { Command } from '../command-info';
import { Wiki, EventData } from '../wiki/api';
import { DateTime, Duration } from 'luxon';

// Retrieve command name from filename
const name = path.parse(__filename).name;

function parseTime(timeStr: string, isStartTime: boolean): DateTime {
  if (!timeStr) {
    const time = DateTime.fromObject({ zone: 'Asia/Tokyo' });
    const duration = Duration.fromObject({
      years: 24,
    });

    return time.plus(duration);
  }
  const [year, month, day] = timeStr
    .split(' ')[0]
    .split('/')
    .map((num) => parseInt(num, 10));
  const [hour, minute] =
    timeStr.split(' ').length > 1
      ? timeStr
          .split(' ')[1]
          .split(':')
          .map((num) => parseInt(num, 10))
      : isStartTime
      ? [15, 0]
      : [23, 59];

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
  const diff = end.diffNow(['years', 'months', 'days', 'hours']);
  let days = 0;
  let hours = 0;
  const years = 0;
  if (diff.years > 1) {
    return `2424 years`;
  } else if (diff.hours < 0) {
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
      const startTime = parseTime(event.start, true);
      return startTime <= time;
    });

    const upcomingEvents = events.filter((event) => {
      const startTime = parseTime(event.start, true);
      return startTime > time;
    });

    const em = new Discord.MessageEmbed();
    em.setTitle(`Timed events for ${time.monthLong} ${time.year}`);

    ongoingEvents.sort((a, b) => parseTime(a.end, false).toMillis() - parseTime(b.end, false).toMillis());
    // let ongoing = '';
    const ongoingEventsLines = ongoingEvents.map((event) => {
      const endTime = parseTime(event.end, false);
      const diffHours = endTime.diff(time, 'hours').toObject()['hours'];
      if (diffHours === undefined) return;
      return `•${diffHours < 24 ? '🚨' : ''}**${event.name} (${event.jpname})**: Ends in ${showRemaining(endTime)}\n`;
    });

    upcomingEvents.sort((a, b) => parseTime(a.start, true).toMillis() - parseTime(b.start, true).toMillis());
    // let upcoming = '';
    const upcomingEventsLines = upcomingEvents.map((event) => {
      const startTime = parseTime(event.start, true);
      const diffHours = startTime.diff(time, 'hours').toObject()['hours'];
      if (diffHours === undefined) return;
      return `•${diffHours < 24 ? '🔔' : ''}**${event.name} (${event.jpname})**: Starts in ${showRemaining(
        startTime,
      )}\n`;
      // upcoming += `Ends: ${event.end}\n\n`;
    });

    em.setDescription(
      `This list was generated at: ${time.year}/${time.month}/${time.day} ${time.hour}:${time.minute} JST`,
    );

    // if (ongoing) em.addField('Ongoing Events', ongoing);
    // if (upcoming) em.addField('Upcoming Events', upcoming);

    let ongoingText = '';
    let ongoingTitle = 'Ongoing Events';
    for (const line of ongoingEventsLines) {
      if ((ongoingText + line).length > 1024) {
        em.addField(ongoingTitle, ongoingText);
        ongoingText = '';
        ongoingTitle = 'Ongoing Events (cont.)';
      }
      ongoingText += line;
    }
    if (ongoingText) em.addField(ongoingTitle, ongoingText);

    let upcomingText = '';
    let upcomingTitle = 'Upcoming Events';
    for (const line of upcomingEventsLines) {
      if ((upcomingText + line).length > 1024) {
        em.addField(upcomingTitle, upcomingText);
        upcomingText = '';
        upcomingTitle = 'Upcoming Events (cont.)';
      }
      upcomingText += line;
    }
    if (upcomingText) em.addField(upcomingTitle, upcomingText);

    em.setURL(`https://puyonexus.com/wiki/PPQ:Event_News_Archive/${time.monthLong}_${time.year}`);
    message.channel.send(em);
  },
} as Command;
