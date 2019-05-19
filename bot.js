const QUOTE_PIN_EMOTE = "📌", ANTI_QUOTE_PIN_EMOTE = "👎", VOTE_REACTS = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3", "\u0030\u20E3"];
const QUOTE_PIN_THRESH = 2;
const PERMISSIONS = {"ADMIN": 1, "QUOTEKILL": 2, "UNDO": 4};
const DEFAULT_PERMISSIONS = 4;

const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require('fs');
const DEBUG = false;
var auth = require('./auth.json');
client.on('ready', function (evt) {
    console.log('Connected');
});

var savedData = {}, config = {};

function save() {
    fs.writeFile("./save.json", JSON.stringify(savedData), 'utf8');
}

function emptySaveFile() {
    return {quotes: [], users: []};
}

function load() {
    fs.readFile("./save.json", 'utf8', (err, data) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        savedData = JSON.parse(data);
        if(!savedData["votes"]) savedData["votes"] = [];
        if(!savedData["list"]) savedData["list"] = [];
        if(!savedData["cfg"]) savedData["cfg"] = {"terminal": TERMINAL_TOKENS};
        savedData["cfg"]["recursive"] = RECURSIVE_TOKENS;
    });
    fs.readFile("./config.json", 'utf8', (err, data) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        config = JSON.parse(data);
    });
}

function formatDuration(ms) {
    let result = "",
        sec = (ms / 1000 >> 0) % 60,
        min = (ms / 60 / 1000 >> 0) % 60, 
        hr = (ms / 60 / 60 / 1000 >> 0) % 24,
        days = (ms / 24 / 60 / 60 / 1000 >> 0);
    if (days > 0) result += days + (days != 1 ? " days " : " day ");
    if (hr > 0) result += hr + (hr != 1 ? " hours " : " hour ");
    if (min > 0) result += min + (min != 1 ? " minutes " : " minute ");
    result += sec + (sec != 1 ? " seconds" : " second");
    return result;
}

function sendQuote(channel, userID, content) {
    let name = savedData["users"][userID] && savedData["users"][userID]["n"] ? savedData["users"][userID]["n"] : "unknown";
    channel.send('*"' + content + '"*\n                                        -' + name);
}

function getUserPermission(id, permissionName, channel) {
    let valid = PERMISSIONS[permissionName] && savedData["users"][id] && savedData["users"][id]["p"] && (savedData["users"][id]["p"] & (PERMISSIONS[permissionName] | PERMISSIONS["ADMIN"])) != 0;
    if(!valid && channel) {
        channel.send();
    }
    return valid;
}

function ensureUser(id) {
    if(!savedData["users"][id]) savedData["users"][id] = {};
    if(!savedData["users"][id]["t"]) savedData["users"][id]["t"] = [];
    if(!savedData["users"][id]["p"]) savedData["users"][id]["p"] = DEFAULT_PERMISSIONS;
}

function fillUpTo(message, curr, max) {
    if(curr == max) return;
    message.react(VOTE_REACTS[curr]).then(r=>fillUpTo(r.message, curr + 1, max));
}

function produceChart(channel, users, members, days) {
    let timestamps = [], nicknames = [];
    let call = "python3 ./chartgen.py " + days + " " + users.length + " " + Date.now() + " ";
    for (let i = 0; i < users.length; i++) {
        timestamps[i] = "" + savedData["users"][users[i].id]["t"].map(tt=>tt.d);
        if (savedData["users"][users[i].id]["t"].length == 0) timestamps[i] = ["0"];
        nicknames[i] = members[i].displayName.replace(/'/g,"");
    }
    for (let i = 0; i < users.length; i++) call += timestamps[i] + " ";
    for (let i = 0; i < users.length; i++) call += "'" + nicknames[i] + "' ";

    let chartgen = require('child_process').exec(call, (error, stdout, stderr) => {
        console.log("ERROR: " + error);
        console.log("STDOUT: " + stdout);
        console.log("STDERR: " + stderr);
        channel.send({
            files: [{
                attachment: './chart.png',
                name: 'botchart.png'
            }]
        })
    });
}

//********************* CFG
// THESE ARE DEFAULTS ONLY
var TERMINAL_TOKENS = {
    "<p_noun>": ["Alexander"],
    "<noun>": ["glass of water"],
    "<trans_verb>": ["drank"],
    "<i_verb>": ["studied"],
    "<adjective>": ["refreshing"],
    "<article>": ["a"],
    "<adverb>": ["thirstily"]
};
var RECURSIVE_TOKENS = {
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

function randInt(n) {
    return Math.floor(Math.random() * n);
}

function parseCFG(tk) {
    return tk.replace(/<[^>]*>/g, function(token) {
        if(token in savedData["cfg"]["recursive"]) {
            let list = savedData["cfg"]["recursive"][token];
            return parseCFG(list[randInt(list.length)]);
        }
        if(token in savedData["cfg"]["terminal"]) {
            let list = savedData["cfg"]["terminal"][token];
            return list[randInt(list.length)];
        }
        return token;
    });
}


function getCFGSentence() {
    let punct = [".", ".", ".", "...", "!"];
    punct = punct[randInt(punct.length)];
    let raw = parseCFG("<sentence>");
    return raw.charAt(0).toUpperCase() + raw.slice(1) + punct;
}

function fetchVocab(name, channel) {
    if (name == "all") {
        let ans = [];
        for (key in savedData["cfg"]["terminal"]) ans = ans.concat(savedData["cfg"]["terminal"][key]);
        return ans;
    }
    name = "<" + name + ">";
    if (name in savedData["cfg"]["terminal"]) {
        return savedData["cfg"]["terminal"][name];
    } else {
        let s = config["part_of_speech_error"].replace("{c}", Object.keys(savedData["cfg"]["terminal"]));
        channel.send(s);
        return null;
    }
}

//********************* /CFG


client.on('message', (message) => {
    console.log(message.author.username + ": " + message.content);
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'ping':
                message.channel.send(config["ping_response"]);
                break;
            case 'vote': // !vote 2 A B name of vote
                ensureUser(message.author.id);
                let count = parseInt(args[0]), options = [];
                if (count <= 0 || count > 10 || args.length < count + 1) {
                    message.channel.send(config["vote_error"]);
                    return;
                }
                let voteString = VOTE_REACTS[0] + ": " + args[1];
                for (let i = 0; i < count; i++) {
                    options.push(args[i + 1]);
                    if(i > 0) voteString += ", " + VOTE_REACTS[i] + ": " + options.last();
                }
                let vote = {
                    createdAt: Date.now(),
                    author: message.author.id,
                    name: args.slice(count + 1).join(" "),
                    options: options
                };
                let voteProposalString = config["vote_proposal"]
                    .replace("{u}", message.member.displayName)
                    .replace("{n}", vote.name)
                    .replace("{v}", voteString);
                message.channel.send(voteProposalString).then(m=>{
                    vote["messageId"] = m.id;
                    savedData["votes"].push(vote);
                    save();
                    fillUpTo(m, 0, vote.options.length);
                });
                break;
            case 'votestatus':
                let voteF = false;
                if(args.length > 0) {
                    let name = args.join(" ");
                    voteF = savedData["votes"].find(v=>v.name === name);
                    if(!voteF) {
                        message.channel.send("vote_search_error");
                        return;
                    }
                } else {
                    voteF = savedData["votes"].last();
                    if(!voteF) {
                        message.channel.send(config["votes_empty_error"]);
                        return;
                    }
                }
                message.channel.fetchMessage(voteF.messageId).then(m=>{
                    let totalCount = 0, maxLength = 0;
                    let rawReacts = m.reactions.filter(r=> {
                        let idx = VOTE_REACTS.indexOf(r.emoji.name);
                        return idx > -1 && idx < voteF.options.length;
                    });
                    let votes = rawReacts.map(r=>{
                        totalCount += r.count - 1;
                        let label = voteF.options[VOTE_REACTS.indexOf(r.emoji.name)];
                        if(label.length > maxLength) maxLength = label.length;
                        return {count: r.count - 1, label: label};
                    });
                    let outputString = "```\n" + voteF.name + ":\n";
                    for(let i = 0; i < votes.length; i++) {
                        let percentage = (votes[i].count / totalCount * 100).toFixed(2);
                        outputString += votes[i].label + " ".repeat(maxLength - votes[i].label.length) + ": " + votes[i].count + " (" + percentage + "%)\n";
                    }
                    outputString += "```";
                    message.channel.send(outputString);
                });
                break;
            case 'f':
                if(getUserPermission(message.author.id, "ADMIN", message.channel)) {
                    let member = message.mentions.members.first();
                    if (member) {
                        let fc = member.guild.channels.find(c=>c.name==config["afk_chat_name"]);
                        member.setVoiceChannel(fc);
                    }
                }
                break;
            case config["log_command"]:
                ensureUser(message.author.id);
                savedData["users"][message.author.id]["t"].push({"d": Date.now(), "c": args.join(" ")});
                message.channel.send(config["log_response"].replace("{u}", message.member.displayName));
                save();
                break;
            case 'undo':
                ensureUser(message.author.id);
                if(getUserPermission(message.author.id, "UNDO", message.channel)) {
                    let drugArray = savedData["users"][message.author.id]["t"];
                    if (drugArray.length > 0) {
                        savedData["users"][message.author.id]["t"] = drugArray.splice(0, drugArray.length - 1);
                        message.channel.send(config["undo_response"].replace("{u}", message.member.displayName));
                    } else {
                        message.channel.send(config["undo_error"]);
                    }
                    save();
                }
                break;
            case 'when':
                let id = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id,
                    nickname = message.mentions.members.first() ? message.mentions.members.first().displayName : message.member.displayName;
                ensureUser(id);
                if (savedData["users"][id]["t"].length > 0) {
                    let timeDifference = formatDuration(Date.now() - savedData["users"][id]["t"].last()["d"]), sign = savedData["users"][id].hasOwnProperty("e") ? savedData["users"][id]["e"] : "<:max:515735937846738945>";
                    message.channel.send(config["when_response"].replace("{d}", timeDifference).replace("{u}", nickname).replace("{s}", sign));
                } else {
                    message.channel.send(config["when_error"].replace("{u}", nickname));
                }
                break;
            case 'chart':
                let dCount = parseInt(args[0]);
                if (!(dCount > 0 && dCount <= 365)) {
                    message.channel.send(config["chart_error"]);
                    return;
                }
                let mentionUsers = message.mentions.users.array(), mentionMembers = message.mentions.members.array();
                if (mentionUsers.length == 0) {
                    mentionUsers = [message.author];
                    mentionMembers = [message.member];
                }
                for(let uuu = 0; uuu < mentionUsers; uuu++) ensureUser(mentionUsers[uuu].id);
                produceChart(message.channel, mentionUsers, mentionMembers, dCount);
                break;
            case 'signature':
                if(args.length == 0) return;
                if(!savedData["users"][message.author.id]) savedData["users"][message.author.id] = {};
                savedData["users"][message.author.id]["e"] = args[0];
                save();
                message.react("👍");
                break;
            case 'name':
                let iid = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id,
                    nnickname = message.mentions.members.first() ? message.mentions.members.first().displayName : message.member.displayName;;
                if(!savedData["users"][iid] || !savedData["users"][iid]["n"]) message.channel.send(config["quote_name_error"]);
                else message.channel.send(config["quote_name_response"].replace("{u}", nnickname).replace("{n}", savedData["users"][iid]["n"]));
                break;
            case 'setname':
                if(!message.mentions.users.first()) {
                    message.channel.send(config["set_quote_name_error"]);
                    return;
                }
                let user = message.mentions.users.first();
                if(!savedData["users"][user.id]) savedData["users"][user.id] = {};
                savedData["users"][user.id]["n"] = args.splice(1).join(" ");
                save();
                message.react("👍");
                break;
            case config["add_list_command"]:
                savedData["list"].push(args.join(" "));
                save();
                message.react("👍");
                break;
            case config["query_list_command"]:
                let lquery = args.join(" ");
                let items = lquery ? savedData["list"].filter(q=>q.includes(lquery)) : savedData["list"];
                if(items.length == 0) {
                    message.channel.send(config["item_error"]);
                    return;
                }
                let rid = Math.floor(Math.random() * (items.length));
                message.channel.send(items[rid]);
                break;
            case 'addquote':
                if(!message.mentions.users.first()) {
                    message.channel.send(config["add_quote_error"]);
                    return;
                }
                let q = { "u": message.mentions.users.first().id, "t": args.splice(1).join(" ") };
                savedData["quotes"].push(q);
                save();
                message.react("👍");
                break;
            case 'delquote':
                if(getUserPermission(message.author.id, "ADMIN", message.channel)) {
                    let query = args.join(" ");
                    for (let i = 0; i < savedData["quotes"].length; i++) {
                        if (savedData["quotes"][i].t.includes(query)) {
                            savedData["quotes"].splice(i, 1);
                        }
                    }
                    save();
                    message.react("👍");
                }
                break;
            case config["delete_list_command"]:
                if(getUserPermission(message.author.id, "ADMIN", message.channel)) {
                    let query = args.join(" ");
                    for (let i = 0; i < savedData["list"].length; i++) {
                        if (savedData["list"][i].includes(query)) {
                            savedData["list"].splice(i, 1);
                        }
                    }
                    save();
                    message.react("👍");
                }
                break;
            case 'quote':
                let query = args.join(" ");
                let quotes, quote;
                if (query || savedData["quotes"].length == 0) {
                    quotes = savedData["quotes"].filter(q=>q.t.includes(query));
                    if(quotes.length == 0) {
                        message.channel.send(config["quote_error"]);
                        return;
                    }
                    let randomID = Math.floor(Math.random() * (quotes.length));
                    quote = quotes[randomID];
                    sendQuote(message.channel, quote.u, quote.t);
                } else {
                    //calculate per-word popularity across the entire domain of quotes
                    let toWords = text=>text.toLowerCase().replace(/[\!\?\,\;\*\"]+/gi, " ").split(" ").filter(a=>a!="");
                    let popularity = {};
                    savedData["quotes"].forEach(q=>{
                        toWords(q.t).forEach(w=>{
                            if(!(w in popularity)) popularity[w] = 0.0;// only construct keys that are needed
                            popularity[w]++;
                        });
                    });



                    // calculate the glossary of appearances of words in the last k quotes
                    let D = 0.7; // PERCENT OF TOTAL WEIGHT DUE TO RELEVANCY
                    let E = 2.2; // EXPONENTIATION POWER OF RELEVANCY SCORES (higher = skew to the most relevant, 0 = any relevance is equal to any other)
                    let k = 7, K = 1;
                    let glossary = {};
                    message.channel.fetchMessages({ limit: k * 9, before: message.id}).then(messages=>{
                        let msgs = [];
                        messages.forEach(msg=>{
                            if (msgs.length >= k) return;
                            let mwords = toWords(msg.content);
                            if (!msg.author.bot && !msg.content.startsWith("!") && mwords.length > 1) {
                                msgs.push(mwords);
                            }
                        });
                        msgs.forEach(msg=>{
                            msg.forEach(w=>{
                                if(!(w in glossary)) glossary[w] = 0.0;
                                glossary[w]++;
                                K++;
                            });
                        });
                        savedData["quotes"].forEach(q=>{
                            let count = 0;
                            toWords(q.t).forEach(w=>{
                                count++;
                            });
                        });
                        let rankSum = 0.0;
                        quotes = savedData["quotes"].map(q=>{
                            let g = 0;
                            // for each word in this quote, increment its rank based on how unusually relevant the appearance of this word was in the last k messages
                            let qwords = toWords(q.t);
                            qwords.forEach(w=>{
                                // if word not in glossary, add 0 to rank instead
                                g += (glossary[w] || 0.0) / popularity[w]; // frequency of this word in the last k quotes over how common it is 
                            });
                            g = Math.pow(g, E);
                            rankSum += g;
                            return {q:q, rank:g};
                        });
                        quotes = quotes.map(q=>({q:q.q, rank: D * q.rank / rankSum + (1.0 - D) / quotes.length}));
                        // for debugging/analysis: log the 10 most likely quotes
                        quotes.sort((a,b)=>b.rank - a.rank);
                        for (let i = 0; i < 10; i++) console.log(quotes[i].q.t + ": " + quotes[i].rank);
                        // weighted random
                        let theta = Math.random(), m = 0.0;
                        for (let i = 0; i < quotes.length; i++) {
                            m += quotes[i].rank;
                            if (m >= theta) {
                                quote = quotes[i].q;
                                break;
                            }
                        }
                        sendQuote(message.channel, quote.u, quote.t);
                    });
                }
                break;
            case 'numquotes':
                let nquery = args.join(" ");
                nquotes = nquery ? savedData["quotes"].filter(q=>q.t.includes(nquery)) : savedData["quotes"];
                message.channel.send(config["num_quotes"].replace("{n}", nquotes.length));
                break;
            case 'clear':
                if(getUserPermission(message.author.id, "ADMIN", message.channel)) {
                    let count = parseInt(args[0]);
                    if(count <= 0 || count > 100) {
                        message.channel.send(config["clear_error"]);
                        return;
                    }
                    message.channel.bulkDelete(count + 1).then(messages => {
                        message.channel.send(config["clear_response"].replace("{n}", count)).then(message => message.delete(3000));
                    });
                }
                break;
            case 'speak':
                let gencount = parseInt(args[0]);
                if (!(gencount > 0 && gencount <= 25)) gencount = 1;
                let s = "";
                for(let i = 0; i < gencount; i++)s += getCFGSentence() + "\n";
                message.channel.send(s);
                break;
            case 'vocab':
                let v = fetchVocab(args[0], message.channel);
                if(v != null) {
                    if (args[1] == "count") {
                        if (args[0] == "all") args[0] = "word";
                        message.channel.send(config["vocab_count_response"].replace("{n}", v.length).replace("{t}", args[0]));
                        return;
                    }
                    v = "" + v.sort();
                    let vocabmsglength = Math.ceil(v.length / 2000);
                    for(let i = 0; i < vocabmsglength; i++)
                        message.channel.send(v.substr(i * 2000, 2000));
                }
                break;
            case 'teach':
                if (args.length < 2) {
                    message.channel.send(config["teach_error"]);
                    return;
                }
                let words = fetchVocab(args[0], message.channel);
                if(words != null) {
                    let newone = args.splice(1).join(" ");
                    if (words.includes(newone)) {
                        message.channel.send(config["teach_repeat_error"]);
                        return;
                    }
                    words.push(newone);
                    save();
                    message.react("👍");
                }
                break;
            case 'forget':
                if(true || getUserPermission(message.author.id, "ADMIN", message.channel)) {
                    if (args.length < 2) {
                        message.channel.send(config["forget_error"]);
                        return;
                    }
                    let words = fetchVocab(args[0], message.channel);
                    if(words != null) {
                        let toremove = args.splice(1).join(" ");
                        if (!words.includes(toremove)) {
                            message.channel.send(config["forget_repeat_error"]);
                            return;
                        }
                        words.splice(words.indexOf(toremove), 1);
                        save();
                        message.react("👍");
                    }
                }
                break;
            case 'help':
                fs.readFile('./helpfile', 'utf8', (e, d) => message.channel.send(d));
                break;
            case 'debug':
                if(!DEBUG) return;
                if(args.length == 0 || args[0] == "manual") {
                    console.log(message.mentions.members.first());
                    return;
                }
                let result = eval(message.content.substr(message.content.indexOf(' ') + 1));
                message.channel.send(result);
                break;
            default:
                let plain_response = config["plain_responses"][cmd];
                if (plain_response !== undefined)
                    message.channel.send(plain_response);
                break;
         }
     } else {
        let lcontent = message.content.toLowerCase();
        if (lcontent.includes("pharmacybot")) {
            hearts = ["💚", "💜", "🖤", "💛", "💙", "❤️"];
            if(lcontent.includes("love pharmacybot") || lcontent.includes("love you pharmacybot")) {
                message.channel.send(config["love_response"]);
            } else {
                message.react(hearts.rand());
            }
        }
     }
});
function reacc(data) {
    if(data["emoji"]["name"] == QUOTE_PIN_EMOTE) {
        client.channels.find('id', data['channel_id']).fetchMessage(data['message_id']).then(message => {
            let antiReaccs = message.reactions.get(ANTI_QUOTE_PIN_EMOTE);
            if(antiReaccs && antiReaccs.users.exists(u => getUserPermission(u.id, "QUOTEKILL"))) return;
            let count = message.reactions.get(QUOTE_PIN_EMOTE).count;
            if(count >= QUOTE_PIN_THRESH) {
                let q = { "u": message.author.id, "t": message.content };
                if(!savedData["quotes"].some((el) => el["t"] == q["t"])) {
                    savedData["quotes"].push(q);
                    save();
                    message.react("👍");
                }
            }
        });
    }
}

client.on('raw', event => {
    if(event["t"] == "MESSAGE_REACTION_ADD") {
        reacc(event["d"]);
    }
});

client.login(auth.token);

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

if (!Array.prototype.rand){
    Array.prototype.rand = function(){
        return this[randInt(this.length)];
    };
};
load();

