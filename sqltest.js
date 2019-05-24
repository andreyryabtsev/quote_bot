const db = require("./lib/db.js");
const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const cp = require('child_process');
db.initialize(main);

var auth, config, client;
var commands = {}, features = {};
function main() {
    console.log("[BOOT] Database connection established.");
    config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    auth = JSON.parse(fs.readFileSync("./auth.json", "utf8"));
    util.initialize(config);
    console.log("[BOOT] Loaded auth and config.");
    client = new discord.Client();
    coreLogic();
    client.login(auth.token);
}

function coreLogic() {
    client.on('ready', e=>console.log("[BOOT] Signed in to Discord account."));
    client.on('message', (message) => {
        if (message.content.startsWith("!")) {
            let argIndex = message.content.indexOf(" ");
            let cmd = argIndex == -1 ? message.content.substring(1) : message.content.substring(1, argIndex);
            if (cmd in commands) {
                let text = message.content.substring(message.content.indexOf(" ") + 1);
                commands[cmd](message, text);
            }
        }
    });
}

// ---------------------------------- CONSTANTS ------------------------------------

const PARTS_OF_SPEECH = ["<p_noun>","<noun>","<trans_verb>","<i_verb>","<adjective>","<article>","<adverb>"];

// ------------------- FEATURES (more complex functionality) -----------------------

features["produceChart"] = (channel, users, members, days) => {
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
            if (error) console.error("[chartgen] ERROR: " + error);
            if (stdout) console.log("[chartgen] " + stdout);
            if (stderr) console.error("[chartgen] " + stderr);
            channel.send({
                files: [{
                    attachment: './chart/chart.png',
                    name: 'botchart.png'
                }]
            })
        });
    });
}










// --------------------- COMMANDS (responses to ! calls) ---------------------------

commands["addquote"] = (message, text) => {
    if(!message.mentions.users.first()) {
        message.channel.send(config["add_quote_error"]);
    } else {
        db.addQuote(message.mentions.users.first().id, text.split(" ").splice(1).join(" "), () => {
            message.react("👍");
        });
    }
}

commands["chart"] = (message, text) => {
    let numDays = parseInt(util.args(text)[0]);
    if (!(numDays > 0 && numDays <= 365)) {
        message.channel.send(config["chart_error"]);
    } else {
        let mentionUsers = message.mentions.users.array(), mentionMembers = message.mentions.members.array();
        if (mentionUsers.length == 0) {
            mentionUsers = [message.author];
            mentionMembers = [message.member];
        }
        features["produceChart"](message.channel, mentionUsers, mentionMembers, numDays);
    }
}

commands["clear"] = (message, text) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, () => {
        let count = parseInt(util.args(text)[0]);
        if (count <= 0 || count > 100) {
            message.channel.send(config["clear_error"]);
        } else {
            message.channel.bulkDelete(count + 1).then(messages => {
                message.channel.send(config["clear_response"].replace("{n}", count)).then(message => message.delete(2000));
            });
        }
    });
}

commands["delquotes"] = (message, text) => {
    console.log("deleting: " + text);
    util.getPermission(db, message.author.id, "ADMIN", message.channel, () => {
        db.deleteQuotes(text, () => {
            message.react("👍");
        });
    });
}

commands["f"] = (message) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, () => {
        let member = message.mentions.members.first();
        if (member) {
            let afkChannel = member.guild.channels.find(c=>c.name==config["afk_chat_name"]);
            member.setVoiceChannel(afkChannel);
        }
    });
}

commands["forget"] = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    if (args.length < 2 || PARTS_OF_SPEECH.indexOf(pos) == -1) {
        message.channel.send(config["forget_error"]);
    } else {
        let vocabType = PARTS_OF_SPEECH.indexOf(pos);
        db.forgetVocab(vocabType, args[1], deletions => {
            if (deletions == 0) {
                message.channel.send(config["forget_repeat_error"]);
            } else {
                message.react("👍");
            }
        });
    }
}

commands["help"] = (message) => {
    fs.readFile('./helpfile', 'utf8', (error, data) => {
        if (error) {
            console.error(error);
            process.exit(1);
        }
        message.channel.send(data);
    });
}

commands["ping"] = (message) => {
    message.channel.send(config["ping_response"]);
}
