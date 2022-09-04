const Discord = require("discord.js");
const config = require("./config.json");
const GeoPoint = require('geopoint');
const { Client } = require('discord.js-selfbot-v13');

const listenerClient = new Client();
const senderClient = new Discord.Client();

const lvl_re = /L(\d)+/;
const pvp_gl_re = /Rank 1 great league /;
const pvp_ul_re = /Rank 1 ultra league /;
const coord_re1 = /q=(-?[0-9\.]+),(-?[0-9\.]+)/;
const coord_re2 = /query=(-?[0-9\.]+),(-?[0-9\.]+)/;
const perf_re = /100%/

var ultraMap, trashMap, locSpec, raidGyms, raidFilters, pvpUltra, pvpGreat;

function refreshConfig() {
  ultraMap = new Map(config.ultra.map(l =>
    [Number(l[0]), new RegExp(l[1].join('|'))]));
  trashMap = new Map(config.trash.map(l =>
    [Number(l[0]), new RegExp(l[1].join('|'))]));
  locSpec = new Map(config.channelSpec);
  raidGyms = new Map(config.raidSpec.gyms.map(l =>
    [l[0], [l[1], new RegExp(l[2].join('|'))]]));
  raidFilters = new RegExp(config.raidSpec.filters.join('|'));
  
  pvpUltra = new RegExp(config.pvpSpec.ultra.join('|'));
  pvpGreat = new RegExp(config.pvpSpec.great.join('|'));
}

function createEmbed(data) {
  var embed = new Discord.RichEmbed()
    .setTitle(data.title)
    .setDescription(data.description)
    .setURL(data.url)
    .setThumbnail(data.thumbnail.url);
  console.log(data.title);
  console.log(data.description);
  return embed;
}

function isSkipAll(header) {
  // Any pvp pokemon
  if (pvpUltra.test(header) || pvpGreat.test(header)) {
    return false;
  }
  // Any pvp #1 or hundo pokemon
  if (pvp_gl_re.test(header)
      || pvp_ul_re.test(header)
      || perf_re.test(header)) {
    return false;
  }
  // Candy for ultra channel
  for (let [level, reg] of ultraMap) {
    if (reg.test(header)) {
      return false;
    }
  }
  return true;
}

function isPvp(header) {
  // TODO: Implement finding if rank is ultra or great
  if (pvpUltra.test(header) && pvp_ul_re.test(header)) {
    return true;
  }
  if (pvpGreat.test(header) && pvp_gl_re.test(header)) {
    return true;
  }
  return false;
}

function isUltra(header) {
  for (let [level, reg] of ultraMap) {
    if (reg.test(header) && perf_re.test(header)
        && Number(header.match(lvl_re)[0].substring(1)) >= level) {
      return true;
    }
  }
  return false;
}

function isTrash(header) {
  if (isPvp(header)) {
    return false;
  }
  for (let [level, reg] of trashMap) {
    if (reg.test(header) &&
        Number(header.match(lvl_re)[0].substring(1)) < level &&
        !header.includes("Ditto")) {
      return true;
    }
    if (!perf_re.test(header)) {
      return true;
    }
  }
  return false;
}

function toSend(data, spec) {
  const start = new GeoPoint(spec[1][0], spec[1][1]);
  console.log(data);
  var coord = [];
  if (data.url) {
    coord = data.url.match(coord_re1);
  } else {
    coord = data.description.match(coord_re2);
  }
  const end = new GeoPoint(Number(coord[1]),Number(coord[2]));
  const dist = start.distanceTo(end);
  console.log("Distance: " + dist);
  if (isTrash(data.title + data.description) && dist > spec[2]) return false;
  if (isUltra(data.title + data.description) && dist < spec[4]) return true;
  if (dist < spec[3] && !isSkipAll(data.title + data.description)) return true;
  return false;
}

refreshConfig();

listenerClient.on("ready", () => {
  console.log("I am ready!");
});

listenerClient.login(process.env.LISTENER_TOKEN);
senderClient.login(process.env.SENDER_TOKEN);

listenerClient.on("messageCreate", message => {
  var data = message.embeds[0];
  // Check pogeys
  if (message.channel.id in config.sourceChannels) {
    var embed = createEmbed(data);
    for (let [channel, spec] of locSpec) {
      console.log(channel);
      if (toSend(data, spec)) {
        senderClient.channels.get(spec[0]).send({embed});
        console.log("Sent.");
      } else {
        console.log("Not sent.");
      }
    }
  // Check raids
  } else if (config.raidChannel == message.channel.id) {
    var embed = createEmbed(data);
    for (let [channel, spec] of raidGyms) {
      console.log(channel);
      if (spec[1].test(data.title) && raidFilters.test(data.title)) {
        senderClient.channels.get(spec[0]).send({embed});
        console.log("Sent.");
      } else {
        console.log("Not sent.");
      }
    }
  }
});
