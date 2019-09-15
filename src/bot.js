// Runtime bot logic core:
const REMINDER_POLLING_RATE = 5000;
const PARTS_OF_SPEECH = ["<p_noun>","<noun>","<trans_verb>","<i_verb>","<adjective>","<article>","<adverb>"];
const VOTE_REACTIONS = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3", "\u0030\u20E3"];
const ACKNOWLEDGEMENT_EMOTE = "👍";

// Discord events for bot to respond to:
function bindAPIEvents() {
    client.on('guildMemberAdd', (member) => {
        db.addUsersIfNew([member.user.id], () => {});
    });
    client.on('message', (message) => {
        console.log(message.author.username + ": " + message.content);
        if (shared.processFilter(message)) return;
        if (message.content.startsWith("!")) {
            let argIndex = message.content.indexOf(" ");
            let cmd = argIndex == -1 ? message.content.substring(1) : message.content.substring(1, argIndex);
            if (cmd in commands) {
                let text = argIndex == -1 ? "" : message.content.substring(argIndex + 1);
                commands[cmd](core, message, text);
            }
        } else {
            shared.nlp(message);
        }
    });
    client.on('raw', event => {
        if (event["t"] == "MESSAGE_REACTION_ADD") {
            shared.processReaction(event["d"]);
        }
    });
}


// --- BOOT SEQUENCE --- //
const db = require("./lib/db.js");
const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const cp = require('child_process');
const init = require("./lib/coreUtil.js");
var core, config, client, filter, reminders, reminderInterval, commands = {}, shared = {}, automata = {};

// Iterate over all known users and ensure each is registered; load reminders
function initializeDB(callback) {
    let userIDs = init.knownUserIDs(client);
    db.addUsersIfNew(userIDs, () => {
        db.allReminders(remindersOutput => {
            reminders = remindersOutput.map(r => {
                return {id: r.id, channelID: r.channel_id, discordID: r.discord_id, start: r.invoked_on, seconds: r.delay_seconds, note: r.content};
            });
            reminderInterval = setInterval(shared.scanReminders, REMINDER_POLLING_RATE);
            callback();
        });
    });
}

function loadCode() {
    return new Promise(resolve => {
        init.forEachFile("commands/", function(item) {
            let command = require("./commands/" + item);
            let name = item.substring(0, item.lastIndexOf("."));
            if (config["alias"][name]) name = config["alias"][name];
            commands[name] = command;
        }, () => {
            init.forEachFile("shared/", function(item) {
                let method = require("./shared/" + item);
                shared[item.substring(0, item.lastIndexOf("."))] = function(...inputs) {
                    return method(core, ...inputs);
                };
            }, () => {
                init.forEachFile("automata/", function(item) {
                    let method = require("./automata/" + item);
                    automata[item.substring(0, item.lastIndexOf("."))] = method;
                }, resolve);
            });
        });
    });
}

async function boot() {
    console.log("[BOOT] Database connection established.");
    config = init.loadAuthAndConfig(util);
    console.log("[BOOT] Loaded config and auth.");
    await loadCode(config);
    console.log("[BOOT] Loaded modules.");
    filter = init.loadFilter(util);
    init.prepareConfigHelp(config);
    for (let cmd in config["plain_responses"]) {
        commands[cmd] = (core, message) => {
            message.channel.send(config["plain_responses"][cmd]);
        }
    }
    console.log("[BOOT] Loaded filter, prepared help, loaded custom responses.");
    client = new discord.Client();
    client.on('error', util.logError);
    client.on('ready', e => {
        console.log("[BOOT] Signed in to Discord.");
        initializeDB(() => {
            core = {client, db, fs, cp, util, filter, config, shared, reminders, automata,
                ACKNOWLEDGEMENT_EMOTE, PARTS_OF_SPEECH, VOTE_REACTIONS, REMINDER_POLLING_RATE, vocabUpdate: null};
            bindAPIEvents();
            console.log("[BOOT] Initialized all data, ready.");
        });
    });
    client.login(config.authToken).catch(error => {
        util.logError(error);
        util.fatalError();
    });
}
db.initialize(boot);
