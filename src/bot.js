const db = require("./lib/db.js");
const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const cp = require('child_process');
db.initialize(main);

const REMINDER_POLLING_RATE = 5000;
var auth, config, client, filter, reminders, reminderInterval;
var commands = {}, shared = {};
var core = {};
// command code loading
util.forEachFile("commands/", function(item) {
    let command = require("./commands/" + item);
    commands[item.substring(0, item.lastIndexOf("."))] = command;
}, () => console.log("[BOOT] Loaded commands."));
// shared methods
util.forEachFile("shared/", function(item) {
    let method = require("./shared/" + item);
    shared[item.substring(0, item.lastIndexOf("."))] = function(...inputs) {
        return method(core, ...inputs);
    };
}, () => console.log("[BOOT] Loaded shared code."));

// end command code loading

function loadConfig() {
    try {
        auth = JSON.parse(fs.readFileSync("./auth.json", "utf8"));
        config = JSON.parse(fs.readFileSync("./default_config.json", "utf8"));
    } catch (e) {
        util.logError("Unable to load auth and default config; please ensure defaults have not been edited and you copied defaults/auth.json", e);
        util.fatalError();
    }
    let custom;
    try {
        custom = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    } catch (e) {
        util.logError("Custom config missing or malformatted, proceeding with default.");
        custom = {}
    }
    util.deepMerge(config, custom);
}
function loadFilter() {
    try {
        filter = fs.readFileSync("./filter.txt", "utf8");
    } catch (e) {
        util.logError("No filter list found, filtering disabled.");
        filter = "";
    }
    filter = filter.split("\n").filter(raw => /\S/.test(raw)).map(raw => new RegExp(raw, "i"));
}
function main() {
    console.log("[BOOT] Database connection established.");
    loadConfig();
    loadFilter();
    prepareConfigHelp();
    configurableCommands();
    console.log("[BOOT] Loaded and processed auth, filter and config.");
    client = new discord.Client();
    bindAPIEvents();
    client.login(auth.token).catch(error => {
        util.logError(error);
        util.fatalError();
    });
}

// Iterate over all known users and ensures each has a row in the users table
// Also load in reminders
function initializeData(callback) {
    let userIDs = [];
    client.guilds.forEach(guild => {
        if (guild.available) {
            guild.members.forEach(member => {
                userIDs.push(member.user.id);
            });
        }
    });
    db.addUsersIfNew(userIDs, () => {
        db.allReminders(remindersOutput => {
            reminders = remindersOutput.map(r => {
                return {id: r.id, channelID: r.channel_id, discordID: r.discord_id, start: r.invoked_on, seconds: r.delay_seconds, note: r.content};
            });
            reminderInterval = setInterval(scanReminders, REMINDER_POLLING_RATE);
            callback();
        });
    });
}

// Once config has been loaded, parse the help_items object for references to other config properties
function prepareConfigHelp() {
    let parseValue = value => {
        value = value.substring(1, value.length - 1);
        let args = value.split(".");
        let obj = config;
        for (let i = 0; i < args.length; i++) {
            if (!(args[i] in obj)) return "CONFIG_ERROR";
            obj = obj[args[i]];
        }
        return obj;
    };
    let parseText = text => {
        return text.replace(/{[^}]*}/g, parseValue);
    }
    for (let oldName in config["help_items"]) {
        let newName = parseText(oldName);
        let newValue = parseText(config["help_items"][oldName]);
        delete config["help_items"][oldName];
        config["help_items"][newName] = newValue;
    }
    for (let plainResponse in config["plain_responses"]) {
        let helpKey = "`!" + plainResponse + "`";
        if (!(helpKey in config["help_items"])) {
            config["help_items"][helpKey] = "respond with " + config["plain_responses"][plainResponse];
        }
    }
}

// Attach event handlers to the needed Discord-emitted events; includes some simple logic for non-command responses
function bindAPIEvents() {
    client.on('error', util.logError);
    client.on('ready', e => {
        console.log("[BOOT] Signed in to Discord account.");
        initializeData(() => {
            core = {client, db, util, config};
            console.log("[BOOT] Initialized all data, ready.");
        });
    });
    client.on('guildMemberAdd', (member) => {
        db.addUsersIfNew([member.user.id], () => {});
    });
    client.on('message', (message) => {
        console.log(message.author.username + ": " + message.content);
        if (processFilter(message)) return;
        if (message.content.startsWith("!")) {
            let argIndex = message.content.indexOf(" ");
            let cmd = argIndex == -1 ? message.content.substring(1) : message.content.substring(1, argIndex);
            if (cmd in commands) {
                let text = argIndex == -1 ? "" : message.content.substring(argIndex + 1);
                commands[cmd](core, message, text);
            }
        } else {
            let text = message.content.toLowerCase();
            if ((text.startsWith("bot") || text.startsWith(config["general"]["bot_name"])) && text.endsWith("?")) {
                if (text.includes("percent") || text.includes("%")) {
                    message.channel.send(Math.floor(Math.random() * 101) + "%!");
                } else {
                    message.channel.send((Math.random() < 0.5) ? "Yes!" : "No!");
                }
            } else if (text.includes(config["general"]["bot_name"])) {
                hearts = ["💚", "💜", "🖤", "💛", "💙", "❤️"];
                let affections = ["love " + config["bot_name"], "love you " + config["general"]["bot_name"], "love u " + config["general"]["bot_name"]];
                if (affections.some(affection => text.includes(affection))) {
                    message.channel.send(config["general"]["love_response"]);
                } else {
                    message.react(util.simpleRandom(hearts));
                }
            }
        }
    });
    client.on('raw', event => {
        if (event["t"] == "MESSAGE_REACTION_ADD") {
            processMessageReaction(event["d"]);
        }
    });
}

// ---------------------------------- CONSTANTS ------------------------------------

const PARTS_OF_SPEECH = ["<p_noun>","<noun>","<trans_verb>","<i_verb>","<adjective>","<article>","<adverb>"];

const RECURSIVE_TOKENS = {
    "<sentence>": ["<simple_sentence>", "<simple_sentence>", "<compound_sentence>"],
    "<simple_sentence>" : ["<noun_phrase> <verb_phrase>"],
    "<compound_sentence>" : ["<simple_sentence> and <simple_sentence>"],
    "<noun_phrase>": ["<article_particle> <adjective_phrase> <noun>", "<p_noun>"],
    "<adjective_phrase>": ["<adjective>", "<adjective>", "<adjective> <adjective_phrase>"],
    "<verb_phrase>": ["<trans_verb_particle> <noun_phrase>", "<i_verb_particle>"],
    "<trans_verb_particle>": ["<trans_verb>", "<adverb> <trans_verb>"],
    "<i_verb_particle>": ["<i_verb>", "<adverb> <i_verb>", "<i_verb> <adverb>"],
    "<article_particle>": ["<article>", "<p_noun>'s"]
};

const VOCAB_WORDS_PER_MESSAGE = 120;

const VOTE_REACTIONS = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3", "\u0030\u20E3"];

const QUOTE_PIN_EMOTE = "📌", ANTI_QUOTE_PIN_EMOTE = "👎";

const ACKNOWLEDGEMENT_EMOTE = "👍";

// ------------------- FEATURES (more complex functionality) -----------------------

// Uses config to generate a help message for the bot functionality
let generateHelp = () => {
    let helpLines = [config["help"]["header"] + "\n"];
    let items = Object.keys(config["help_items"]).sort();
    for (let item of items) {
        helpLines.push(item + " - " + config["help_items"][item] + "\n");
    }
    return helpLines;
}

// CFG: Compute and store the vocab lists from database, refreshing with a new query when over
// 20 seconds has passed. Optimizes !speak which may need to reuse the lists very many times.
let vocabCache, vocabUpdate;
let parseCFG = (tk) => {
    return tk.replace(/<[^>]*>/g, function(token) {
        if (token in RECURSIVE_TOKENS) {
            let list = RECURSIVE_TOKENS[token];
            return parseCFG(util.simpleRandom(list));
        }
        let typeID = PARTS_OF_SPEECH.indexOf(token);
        if (typeID > -1) {
            return util.simpleRandom(vocabCache[typeID]) || token;
        }
        return token;
    });
}
let updateVocabCache = (i, callback) => {
    if (i >= PARTS_OF_SPEECH.length) {
        callback();
        return;
    }
    if (i == 0) {
        if (vocabUpdate && Date.now() - vocabUpdate < 20000) {
            callback();
            return;
        }
        vocabCache = [];
        for (let i = 0; i < PARTS_OF_SPEECH.length; i++) {
            vocabCache[i] = [];
        }
    }
    db.fetchVocab(i, vocab => {
        vocabCache[i] = vocab;
        updateVocabCache(i + 1, callback);
    });
}

// CFG: Get a number of sentences by recursively iterating across n and saving each sentence to cache.
let getCFGSentence = (callback) => {
    let punct = util.simpleRandom([".", ".", ".", "...", "!"]);
    updateVocabCache(0, () => {
        let raw = parseCFG("<sentence>");
        let final = raw.charAt(0).toUpperCase() + raw.slice(1) + punct;
        callback(final);
    });
}
let sentencesCache = [];
let getCFGSentences = (n, callback, init) => {
    if (init) sentencesCache = [];
    if (n == 0) {
        callback(sentencesCache);
    } else {
        getCFGSentence(sentence => {
            sentencesCache.push(sentence);
            getCFGSentences(n - 1, callback, false);
        });
    }
}



// Recursively iterate over the users who vetoed a quote.
// Only call callback if all these users lack veto permissions.
let checkPinOpposition = (users, i, callback) => {
    if (i == users.length) {
        callback();
    } else {
        db.userPermissions(users[i].id, permissions => {
            if ((permissions & util.permissionValue("QUOTEKILL")) == 0) {
                checkPinOpposition(users, i + 1, callback);
            }
        });
    }
}

// Check if a quote meets the pin threshold and has not already been added.
// If so, add it and update the quote glossary.
let pinQuote = (message) => {
    let count = message.reactions.get(QUOTE_PIN_EMOTE).count;
    if (count >= config["quotes"]["pin_threshold"]) {
        db.filteredQuotes(message.content, results => {
            if (results.length == 0) {
                db.addQuote(message.author.id, Date.now(), message.content, () => {
                    message.react(ACKNOWLEDGEMENT_EMOTE);
                });
            }
        });
    }
}

// Potentially invoke the quote pinning process, checking for veto if attempted vetoes are found.
let processMessageReaction = (event) => {
    if (event.emoji.name == QUOTE_PIN_EMOTE) {
        client.channels.get(event.channel_id).fetchMessage(event.message_id).then(message => {
            let opposition = message.reactions.get(ANTI_QUOTE_PIN_EMOTE);
            if (opposition) {
                checkPinOpposition(opposition.users.array(), 0, () => pinQuote(message));
            } else {
                pinQuote(message);
            }
        });
    }
}

// Match a message against the filter list; delete, reply, and return true iff matched.
let processFilter = (message) => {
    for (let regex of filter) {
        if (regex.test(message.content)) {
            message.delete().then(msg => {
                message.channel.send(config["etc"]["filter_reply"].replace("{u}", message.member.displayName))
                    .then(message => message.delete(config["etc"]["message_delete_wait"]));
            });
            return true;
        }
    }
    return false;
}

// Scan for reminders frequently and post + delete expired ones
let scanReminders = () => {
    let toDelete = [], now = Date.now();
    for (let i = reminders.length - 1; i >= 0; i--) {
        let reminder = reminders[i];
        let expiry = parseInt(reminder.start) + reminder.seconds * 1000;
        if (expiry <= now) {
            // if late by more than double polling rate, likely offline
            let template = expiry <= now - REMINDER_POLLING_RATE * 2000
                ? config["reminders"]["late_reminder"]
                : config["reminders"]["reminder"];
            client.channels.get(reminder.channelID).send(template
                .replace("{u}", "<@" + reminder.discordID + ">")
                .replace("{n}", reminder.note));
            reminders.splice(i, 1);
            toDelete.push(reminder.id);
        }
    }
    if (toDelete.length > 0) db.deleteReminders(toDelete, () => {});
}

// --------------------- COMMANDS (responses to ! calls) ---------------------------
let configurableCommands = () => {
    commands[config["logs"]["log_command"]] = (core, message, text) => {
        db.addLog(message.author.id, Date.now(), text, () => {
            message.channel.send(config["logs"]["log_response"].replace("{u}", message.member.displayName));
        });
    }

    for (let cmd in config["plain_responses"]) {
        commands[cmd] = (core, message, text) => {
            message.channel.send(config["plain_responses"][cmd]);
        }
    }
}
