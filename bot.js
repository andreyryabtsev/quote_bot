const db = require("./lib/db.js");
const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const cp = require('child_process');
db.initialize(main);

var auth, config, client;
var commands = {};
function loadConfig() {
    try {
        auth = JSON.parse(fs.readFileSync("./auth.json", "utf8"));
        config = JSON.parse(fs.readFileSync("./default_config.json", "utf8"));
    } catch (e) {
        util.logError("Unable to load auth and default config; please ensure /defaults has not been edited and you copied defaults/auth.json", e);
        util.fatalError();
    }
    let custom;
    try {
        custom = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    } catch (e) {
        custom = {}
    }
    util.deepMerge(config, custom);
}
function main() {
    console.log("[BOOT] Database connection established.");
    loadConfig();
    prepareConfigHelp();
    configurableCommands();
    console.log("[BOOT] Loaded and processed auth and config.");
    client = new discord.Client();
    bindAPIEvents();
    client.login(auth.token).catch(error=>{
        util.logError(error);
        util.fatalError();
    });
}

// Iterate over all known users and ensures each has a row in the users table
function initializeAllUsers(callback) {
    let userIDs = [];
    client.guilds.forEach(guild => {
        if (guild.available) {
            guild.members.forEach(member => {
                userIDs.push(member.user.id);
            });
        }
    });
    db.addUsersIfNew(userIDs, callback);
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
}

// Attach event handlers to the needed Discord-emitted events; includes some simple logic for non-command responses
function bindAPIEvents() {
    client.on('error', util.logError);
    client.on('ready', e => {
        console.log("[BOOT] Signed in to Discord account.");
        initializeAllUsers(() => {
            console.log("[BOOT] Initialized all data, ready.");
        });
    });
    client.on('guildMemberAdd', (member) => {
        db.addUsersIfNew([member.user.id], () => {});
    });
    client.on('message', (message) => {
        console.log(message.author.username + ": " + message.content);
        if (message.content.startsWith("!")) {
            let argIndex = message.content.indexOf(" ");
            let cmd = argIndex == -1 ? message.content.substring(1) : message.content.substring(1, argIndex);
            if (cmd in commands) {
                let text = argIndex == -1 ? "" : message.content.substring(argIndex + 1);
                commands[cmd](message, text);
            }
        } else {
            let text = message.content.toLowerCase();
            if (text.includes(config["general"]["bot_name"])) {
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
    let helpMessage = config["help"]["header"] + "\n";
    let items = Object.keys(config["help_items"]).sort();
    for (let item of items) {
        helpMessage += item + " - " + config["help_items"][item];
    }
    return helpMessage;
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
                db.addQuote(message.author.id, message.content, () => {
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

// --------------------- COMMANDS (responses to ! calls) ---------------------------

commands["addquote"] = (message, text) => {
    if (!message.mentions.users.first()) {
        message.channel.send(config["quotes"]["add_error"]);
    } else {
        let content = text.substring(text.indexOf(" ") + 1);
        db.addQuote(message.mentions.users.first().id, content, () => {
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
                message.channel.send(config["clear"]["response"].replace("{n}", count)).then(message => message.delete(2000));
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
    message.channel.send(generateHelp());
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
                let quoteGlossary = buildQuoteGlossary(quotes);
                let recentGlossary = {};
                messages = messages.array();
                let count = 0;
                for (let i = 0; i < n; i++) {
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
                        rank += (recentGlossary[word] || 0.0) / quoteGlossary[word];
                    });
                    rank = Math.pow(rank, e);
                    weightSum += rank;
                    return {value: quote, weight: rank};
                }).map(quote => {
                    let processedWeight = p * quote.weight / weightSum + (1 - p) / quotes.length;
                    return {value: quote.value, weight: processedWeight};
                });

                quotes.sort((a,b) => b.weight - a.weight); // sort and report quotes for debug purposes
                for (let i = 0; i < 5; i++) console.log("[relevant_quotes]: " + quotes[i].value.content + ": " + quotes[i].weight);
                let quote = util.weightedRandom(quotes);
                sendQuote(message.channel, quote.content, quote.nickname);
            });
        });
    }
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
                for(let i = 0; i < vocab.length / VOCAB_WORDS_PER_MESSAGE; i++) {
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
