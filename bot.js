const db = require("./lib/db.js");
const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const cp = require('child_process');
db.initialize(main);

const REMINDER_POLLING_RATE = 5000;
var auth, config, client, filter, reminders, reminderInterval;
var commands = {};
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
    client.login(auth.token).catch(error=>{
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
                commands[cmd](message, text);
            }
        } else {
            let text = message.content.toLowerCase();
            if ((text.startsWith("bot") || text.startsWith(config["general"]["bot_name"])) && text.endsWith("?")) {
                if (text.includes("percent") || text.includes("%")) {
                    message.channel.send(Math.floor(Math.random() * 101) + "%!");
                } else if (text.includes("choose") && text.includes("or")) { //if asked to choose between items of a list, returns a random answer
                    let choices = text.split(", ");
                    let results = [];
                    choices.forEach(function(word) {
                        if (word != "bot") {
                            if (word.includes(" ")) word = word.slice(word.lastIndexOf(" ") + 1);
                            if (word.includes("?")) word = word.slice(0, word.length - 1);
                            results.push(word);
                        }
                    });
                    let output = results[Math.floor(Math.random() * results.length)];
                    message.channel.send(output.charAt(0).toUpperCase() + output.slice(1) + "!");
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

// Process all logged events for the selected users and computes the number of days ago they were produced
// Then, write results to ./chart/chartdata and invoke the python visualizer, sending image to channel.
let produceChart = (channel, users, members, days) => {
    let millisecondsInDay = 86400000;
    db.allLogs(users.map(user => user.id), Date.now() - days * millisecondsInDay, results => {
        let usersToLogs = {};
        for (let row of results) {
            if (usersToLogs[row.nickname] == undefined) usersToLogs[row.nickname] = [];
            usersToLogs[row.nickname].push(Math.floor((Date.now() - row.created_at) / millisecondsInDay));
        }
        let chartfile = days + "\n";
        for (let nickname in usersToLogs) {
            chartfile += nickname + "\n" + usersToLogs[nickname].join(" ") + "\n";
        }
        fs.writeFileSync("./chart/chartdata", chartfile, 'utf8');
        cp.exec("python3 ./chart/chartgen.py ./chart/", (error, stdout, stderr) => {
            if (error) util.logError("[chartgen] ERROR: " + error);
            if (stdout) console.log("[chartgen] " + stdout);
            if (stderr) util.logError("[chartgen] " + stderr);
            channel.send({
                files: [{
                    attachment: './chart/chart.png',
                    name: 'botchart.png'
                }]
            })
        });
    });
}

// Parse quotes into popularity of each word
let buildQuoteGlossary = (quotes) => {
    quoteGlossary = {};
    quotes.forEach(quote => {
        util.toWords(quote.content).forEach(word => {
            if (!(word in quoteGlossary)) quoteGlossary[word] = 0;
            quoteGlossary[word]++;
        });
    });
    return quoteGlossary;
}
let sendQuote = (channel, content, author) => {
    channel.send(config["quotes"]["format"].replace("{q}", content).replace("{u}", author));
    db.updateQuote(content, Date.now());
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

// Recursively iterate over 0..n-1 and add vote reactions sequentially.
let addVoteReactions = (message, i, n) => {
    if (i == n) return;
    message.react(VOTE_REACTIONS[i]).then(r => addVoteReactions(message, i + 1, n));
}
// Parse the reactions to a vote and the vote object, constructing a text summary.
let parseVoteMessage = (message, voteInfo) => {
    let longestOption = 0, totalVotes = 0;
    let votes = [];
    message.reactions.forEach(reaction => {
        let optionIndex = VOTE_REACTIONS.indexOf(reaction.emoji.name);
        if (optionIndex > -1 && optionIndex < voteInfo.options.length) {
            totalVotes += reaction.count - 1;
            let label = voteInfo.options[optionIndex];
            if (label.length > longestOption) longestOption = label.length;
            votes.push({label: label, count: reaction.count - 1});
        }
    });
    let output = "```\n" + voteInfo.content + ":\n";
    for (let vote of votes) {
        let percentage = totalVotes == 0 ? "0.00" : (vote.count / totalVotes * 100).toFixed(2);
        output += vote.label + " ".repeat(longestOption - vote.label.length) + ": " + vote.count + " (" + percentage + "%)\n";
    }
    output += "```";
    return output;
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

commands["addquote"] = (message, text) => {
    if (!message.mentions.users.first()) {
        message.channel.send(config["quotes"]["add_error"]);
    } else {
        let content = text.substring(text.indexOf(" ") + 1);
        db.addQuote(message.mentions.users.first().id, Date.now(), content, () => {
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    }
}

commands["chart"] = (message, text) => {
    let numDays = parseInt(util.args(text)[0]);
    if (!(numDays > 0 && numDays <= 365)) {
        message.channel.send(config["logs"]["chart_error"]);
    } else {
        let mentionUsers = message.mentions.users.array(), mentionMembers = message.mentions.members.array();
        if (mentionUsers.length == 0) {
            mentionUsers = [message.author];
            mentionMembers = [message.member];
        }
        produceChart(message.channel, mentionUsers, mentionMembers, numDays);
    }
}

commands["clear"] = (message, text) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        let count = parseInt(util.args(text)[0]);
        if (count <= 0 || count > 100) {
            message.channel.send(config["clear"]["error"]);
        } else {
            message.channel.bulkDelete(count + 1).then(messages => {
                message.channel.send(config["clear"]["response"].replace("{n}", count))
                .then(message => message.delete(config["etc"]["message_delete_wait"]));
            });
        }
    });
}

commands["delquotes"] = (message, text) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        db.deleteQuotes(text, () => {
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    });
}

commands["f"] = (message) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        let member = message.mentions.members.first();
        if (member) {
            member.setVoiceChannel(member.guild.afkChannel);
        }
    });
}

commands["flipcoin"] = (message, text) => {
    let numCoins = parseInt(util.args(text)[0]);
    if (isNaN(numCoins) || numCoins < 1) numCoins = 1;
    if (numCoins > config["etc"]["max_coins"]) {
        message.channel.send(config["etc"]["coin_error"]);
        return;
    }
    let heads = 0;
    for (let i = 0; i < numCoins; i++) if (Math.random() > 0.5) heads++;
    if (numCoins == 1) message.channel.send(heads == 1 ? "Heads!" : "Tails!");
    else message.channel.send(config["etc"]["coin_output_many"].replace("{n}", heads));
}

commands["forget"] = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(config["cfg"]["forget_error"]);
    } else {
        let vocabType = PARTS_OF_SPEECH.indexOf(pos);
        db.forgetVocab(vocabType, args[1], deletions => {
            if (deletions == 0) {
                message.channel.send(config["cfg"]["forget_missing_error"]);
            } else {
                message.react(ACKNOWLEDGEMENT_EMOTE);
            }
        });
    }
}

commands["help"] = (message) => {
    let help = util.splitLongMessage(generateHelp());
    for (let msg of help) message.channel.send(msg);
}

commands["name"] = (message) => {
    let id = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id;
    let displayName = message.mentions.members.first() ? message.mentions.members.first().displayName : message.member.displayName;
    db.quoteName(id, quoteName => {
        if (!quoteName) message.channel.send(config["quotes"]["name_error"]);
        else message.channel.send(config["quotes"]["name_response"].replace("{u}", displayName).replace("{n}", quoteName));
    });
}

commands["numquotes"] = (message, text) => {
    db.filteredQuotes(text, quotes => {
        message.channel.send(config["quotes"]["num_quotes"].replace("{n}", quotes.length));
    });
}

commands["ping"] = (message) => {
    message.channel.send(config["general"]["ping_response"]);
}

commands["quote"] = (message, text) => {
    if (text) {
        db.filteredQuotes(text, quotes => {
            if (quotes.length > 0) {
                let quote = util.simpleRandom(quotes);
                sendQuote(message.channel, quote.content, quote.nickname);
            } else {
                message.channel.send(config["quotes"]["quote_error"]);
                return;
            }
        });
    } else {
        let n = config["quotes"]["relevancy_params"]["message_count"],
            e = config["quotes"]["relevancy_params"]["exponentiation"],
            p = config["quotes"]["relevancy_params"]["weight"];
        message.channel.fetchMessages({ limit: n * 10, before: message.id}).then(messages => {
            db.allQuotes(quotes => {
                if (quotes.length == 0) {
                    message.channel.send(config["quotes"]["quote_error"]);
                    return;
                }
                let minTime = Math.min(...quotes.map(quote => {
                    return !parseInt(quote.called_at) ? Infinity : parseInt(quote.called_at);
                }));
                let quoteGlossary = buildQuoteGlossary(quotes);
                let recentGlossary = {};
                messages = messages.array();
                let count = 0;
                for (let i = 0; i < n*10; i++) {
                    if (!messages[i].author.bot && !messages[i].content.startsWith("!")) {
                        let words = util.toWords(messages[i].content);
                        if (words.length > 1) {
                            for (let word of words) {
                                if (!(word in recentGlossary)) recentGlossary[word] = 0;
                                recentGlossary[word]++;
                            }
                            if (++count >= n) break;
                        }
                    }
                }
                if (Object.keys(recentGlossary).length == 0) {
                    let quote = util.simpleRandom(quotes);
                    sendQuote(message.channel, quote.content, quote.nickname);
                    return;
                }
                let weightSum = 0.0;
                quotes = quotes.map(quote => {
                    let rank = 0.0;
                    util.toWords(quote.content).forEach(word => {
                        if (quoteGlossary[word]) { //todo: figure out why there are quotes whose util.toWords is not a subset of quoteGlossary
                            rank += (recentGlossary[word] || 0.0) / quoteGlossary[word];
                        }
                    });
                    timeRatio = !parseInt(quote.called_at) ? 1 : ((Date.now() - parseInt(quote.called_at)) / (Date.now() - minTime));
                    rank = timeRatio * Math.pow(rank, e);
                    weightSum += rank;
                    return {value: quote, weight: rank};
                }).map(quote => {
                    let processedWeight = p * quote.weight / weightSum + (1 - p) / quotes.length;
                    return {value: quote.value, weight: processedWeight};
                });

                quotes.sort((a,b) => b.weight - a.weight); // sort and report quotes for debug purposes
                for (let i = 0; i < Math.min(5, quotes.length); i++) console.log("[relevant_quotes]: " + quotes[i].value.content + ": " + quotes[i].weight);
                let quote = util.weightedRandom(quotes);
                sendQuote(message.channel, quote.content, quote.nickname);
            });
        });
    }
}

commands["quoteby"] = (message, text) => {
    let user = message.mentions.users.first();
    if (!user) {
        message.channel.send(config["quotes"]["author_error"]);
        return;
    }
    db.authoredQuotes(user.id, quotes => {
        if (quotes.length > 0) {
            let quote = util.simpleRandom(quotes);
            sendQuote(message.channel, quote.content, quote.nickname);
        } else {
            message.channel.send(config["quotes"]["quote_error"]);
            return;
        }
    });
}

commands["reminders"] = (message) => {
    let discordID = message.author.id;
    db.allReminders((reminders) => {
        if (reminders.length == 0) {
            message.channel.send(config["reminders"]["output_empty"]);
        } else {
            reminders = reminders.filter(r => r.discord_id == discordID);
            let output = "```";
            let title = config["reminders"]["output_title"]
                .replace("{n}", reminders.length)
                .replace("{p}", reminders.length != 1 ? "s" : "");
            output += title ? title + "\n" : "";
            for (let reminder of reminders) {
                let alarmTime = parseInt(reminder.invoked_on) + reminder.delay_seconds * 1000;
                let duration = util.formatDuration(alarmTime - Date.now());
                output += config["reminders"]["output_row"]
                    .replace("{d}", duration)
                    .replace("{n}", reminder.content)
                    + "\n";
            }
            let footer = config["reminders"]["output_footer"];
            output += footer ? footer + "```" : "```";
            message.channel.send(output);
        }
    });
}

commands["remindme"] = (message, text) => {
    let seconds = util.timeToSecs(util.args(text)[0]),
        note = text.substring(text.indexOf(" ") + 1),
        now = Date.now();
    if (note === text) note = "";
    if (seconds === null) {
        message.channel.send(config["reminders"]["format_error"]);
    } else {
        db.addReminder(message.author.id, message.channel.id, now, note, seconds, (results) => {
            reminders.push({
                id: results.insertId,
                channelID: message.channel.id,
                discordID: message.author.id,
                start: now,
                seconds: seconds,
                note: note
            });
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    }
}

commands["rng"] = (message, text) => {
    let max = parseInt(util.args(text)[0]);
    if (isNaN(max) || max <= 0) {
        message.channel.send(config["etc"]["rng_error"]);
        return;
    }
    message.channel.send(1 + Math.floor(Math.random() * max));
}

commands["setname"] = (message, text) => {
    let user = message.mentions.users.first() || message.author,
        newName = message.mentions.users.first() ? text.substring(text.indexOf(" ") + 1) : text;
    db.updateNickname(user.id, newName, () => {
        message.react(ACKNOWLEDGEMENT_EMOTE);
    });
}

commands["signature"] = (message, text) => {
    let signature = util.args(text)[0];
    db.updateSignature(message.author.id, signature, () => {
        message.react(ACKNOWLEDGEMENT_EMOTE);
    });
}

commands["speak"] = (message, text) => {
    let n = parseInt(util.args(text)[0]);
    if (!(n > 0 && n <= 25)) n = 1;
    getCFGSentences(n, sentences => {
        let output = "";
        for (let sentence of sentences) {
            output += sentence + "\n";
        }
        message.channel.send(output);
    }, true);
}

commands["teach"] = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(config["cfg"]["teach_error"]);
    } else {
        let word = text.substring(text.indexOf(" ") + 1);
        db.checkVocab(typeID, word, exists => {
            if (exists) {
                message.channel.send(config["cfg"]["teach_present_error"]);
            } else {
                db.addVocab(typeID, word, () => {
                    message.react(ACKNOWLEDGEMENT_EMOTE);
                });
            }
        });
    }
}

commands["undo"] = (message) => {
    util.getPermission(db, message.author.id, "UNDO", message.channel, config["general"]["permission_denied_error"], () => {
        db.deleteLastLog(message.author.id, rowsAffected => {
            if (rowsAffected > 0) {
                message.channel.send(config["logs"]["undo_response"].replace("{u}", message.member.displayName));
            } else {
                message.channel.send(config["logs"]["undo_error"]);
            }
        });
    });
}

commands["vocab"] = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 1 || typeID == -1 && args[0] != "all") {
        message.channel.send(config["cfg"]["vocab_error"]);
    } else {
        if (args[1] == "count") {
            db.countVocab(typeID, count => {
                if (args[0] == "all") args[0] = "word";
                message.channel.send(config["cfg"]["vocab_count_response"].replace("{n}", count).replace("{t}", args[0]));
            });
        } else {
            db.fetchVocab(typeID, vocab => {
                vocab.sort();
                for (let i = 0; i < vocab.length / VOCAB_WORDS_PER_MESSAGE; i++) {
                    let vocabSlice = vocab.slice(i * VOCAB_WORDS_PER_MESSAGE, (i + 1) * VOCAB_WORDS_PER_MESSAGE);
                    message.channel.send(vocabSlice.join(", "));
                }
            });
        }
    }
}

commands["vote"] = (message, text) => {
    let args = util.args(text);
    if (args.length < 3) {
        message.channel.send(config["vote"]["proposal_error"]);
        return;
    }
    let count = parseInt(args[0]), options = [];
    if (count <= 0 || count > 10 || args.length < count + 1) {
        message.channel.send(config["vote"]["proposal_error"]);
        return;
    }

    let voteString = VOTE_REACTIONS[0] + ": " + args[1];
    for (let i = 0; i < count; i++) {
        options.push(args[i + 1]);
        if (i > 0) voteString += ", " + VOTE_REACTIONS[i] + ": " + options[i];
    }
    let voteName = args.slice(count + 1).join(" ");
    let voteProposalString = config["vote"]["proposal"]
        .replace("{u}", message.member.displayName)
        .replace("{n}", voteName)
        .replace("{v}", voteString);
    message.channel.send(voteProposalString).then(voteMessage => {
        db.addVote(voteName, message.channel.id, voteMessage.id, options, Date.now(), message.author.id, () => {});
        addVoteReactions(voteMessage, 0, options.length);
    });
}

commands["votestatus"] = (message, text) => {
    db.lastVote(text, vote => {
        if (!vote) {
            if (text) {
                message.channel.send(config["vote"]["search_error"]);
            } else {
                message.channel.send(config["vote"]["search_error_blank"]);
            }
        } else {
            // Try to find correct channel, default to current one
            let voteChannel = client.channels.get(vote.discord_channel_id) || message.channel;
            voteChannel.fetchMessage(vote.discord_message_id).then(voteMessage => {
                message.channel.send(parseVoteMessage(voteMessage, vote));
            }).catch(error => {
                message.channel.send(config["vote"]["corruption_error"]);
            });
        }
    });
}

commands["when"] = (message, text) => {
    let id = message.mentions.users.first()
            ? message.mentions.users.first().id
            : message.author.id,
        nickname = message.mentions.members.first()
            ? message.mentions.members.first().displayName
            : message.member.displayName;
    db.lastLog(id, (logInfo) => {
        if (logInfo) {
            let duration = util.formatDuration(Date.now() - logInfo.lastLog);
            message.channel.send(config["logs"]["when_response"].replace("{d}", duration).replace("{u}", nickname).replace("{s}", logInfo.signature));
        } else {
            message.channel.send(config["logs"]["when_error"].replace("{u}", nickname));
        }
    });
}

let configurableCommands = () => {
    commands[config["logs"]["log_command"]] = (message, text) => {
        db.addLog(message.author.id, Date.now(), text, () => {
            message.channel.send(config["logs"]["log_response"].replace("{u}", message.member.displayName));
        });
    }

    for (let cmd in config["plain_responses"]) {
        commands[cmd] = (message, text) => {
            message.channel.send(config["plain_responses"][cmd]);
        }
    }
}
