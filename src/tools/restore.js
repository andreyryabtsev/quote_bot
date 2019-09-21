const db = require("../lib/db.js");
const util = require("../lib/util.js");
const discord = require("discord.js");
const init = require("../lib/coreUtil.js");
let l = console.log, config = {};
db.initialize(() => {
    l("DB connected");
    config = init.loadAuthAndConfig(util);
    l("Config loaded");
    client = new discord.Client();
    client.login(config.authToken).catch(error => {
        util.logError(error);
        util.fatalError();
    });
    async function wrapMain() {
        l("Signed in\n");
        await main(client);
        process.exit(0);
    }
    client.on('ready', wrapMain);
});

let addquotes = 0, pinquotes = 0, logs = 0;

async function main(client) {
    for (guild of client.guilds.array()) {
        l("Guild: " + guild.name);
        for (gc of guild.channels.array()) {
            if (gc.type == "text") {
                await processChannel(client, gc);
            }
        }
    }
}
const REQ_TOTAL = 20000;
const PER_REQUEST = 100;
const N_REQUESTS = REQ_TOTAL / PER_REQUEST;
const EARLIEST = new Date('2019-06-15T01:00:00');
const TOTAL = new Date() - EARLIEST;

async function _forEachMessage(client, channel, fn, beforeId, i) {
    let promise = new Promise((accept, reject) => {
        channel.fetchMessages({limit: PER_REQUEST, before: beforeId})
            .then(m => {
                accept(m);
            })
            .catch(e => {
                l(e);
                l("API error, exiting");
                // process.exit(0);
            });
        });
    let res = await promise;
    res.forEach(message => {
        fn(message);
    });

    let m = res.last(1)[0];
    let portionDone = (new Date() - m.createdAt) / TOTAL * 100;
    l(portionDone.toFixed(2) + "% done; last message posted at: ", m.createdAt);
    l("Added " + addquotes + " quotes, pinned " + pinquotes + " quotes, logged " + logs + " logs");
    let newBeforeId = m.id;
    await _forEachMessage(client, channel, fn, newBeforeId, i + 1);
}
async function forEachMessage(client, channel, fn) {
    await _forEachMessage(client, channel, fn, null, 0);


    // async function retry(e) {
    //     l(e);
    //     l("Error hit... retry in " + delay.toFixed(2) + "s");
    //     await sleep(delay * 1000);
    //     let m = await getMessages(client, channel, nextDelay);
    //     accept(m);
    // }
}
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
async function processChannel(client, channel) {
    let canRead = channel.memberPermissions(client.user).has("READ_MESSAGE_HISTORY");
    if (!canRead) return;
    l("  Channel: " + channel.name);
    await forEachMessage(client, channel, async function(message) {
        await processMessage(client, message);
    });
}
//------------------------------------------------
async function processMessage(client, message) {
    if (message.content.startsWith("!")) {
        let argIndex = message.content.indexOf(" ");
        let cmd = argIndex == -1 ? message.content.substring(1) : message.content.substring(1, argIndex);
        let text = argIndex == -1 ? "" : message.content.substring(argIndex + 1);
        actOn(cmd, message, text);
    } else {
        // reactions; need to refetch message
        message = await message.channel.fetchMessage(message.id);
        checkPin(message);
    }
}

function actOn(cmd, message, text) {
    let date = message.createdAt - new Date(0);
    if (cmd == "addquote") {
        if (message.mentions.users.first()) {
            let content = text.substring(text.indexOf(" ") + 1);
            db.addQuote(message.mentions.users.first().id, date, content, () => {
                addquotes++;
            });
        }
    } else if (cmd == config["alias"]["log"]) {
        db.addLog(message.author.id, date, text, () => {
            logs++;
        });
    }
}

function checkPin(message) {
    let date = message.createdAt - new Date(0);
    if (message.reactions.get("👎")) {
        return;
    } else if (message.reactions.get("📌")) {
        let c = message.reactions.get("📌").count;
        if (c >= config["quotes"]["pin_threshold"]) { 
            db.filteredQuotes(message.content, results => {
                if (results.length == 0) {
                    db.addQuote(message.author.id, date, message.content, () => {
                        pinquotes++;
                    });
                }
            });
        }
    }
}
