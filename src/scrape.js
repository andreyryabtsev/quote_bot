const util = require("./lib/util.js");
const discord = require("discord.js");
const fs = require("fs");
const init = require("./lib/coreUtil.js");
const BATCH_SIZE = 100;
let config, client;

// Save all messages to JSON
async function scrapeToJson(client) {
    let channel = client.channels.find(c => c.name === "petri_dish");
    let beforeId = 0, count = 0;

    let fd = fs.openSync("./scrape_results.ndjson", "a");
    while (true) {
        let rawMessages = await channel.fetchMessages({limit: BATCH_SIZE, before: beforeId});
        beforeId = rawMessages.last().id;
        let messages = rawMessages.filter(m =>
            !m.author.bot &&
            !m.content.startsWith("!") &&
            m.content !== "" &&
            m.content.length > 40
        );
        for (const [_, m] of messages) {
            let message = {content: m.content, author_id: m.author.id};
            let message_string = JSON.stringify(message) + "\n";
            fs.appendFileSync(fd, message_string);
        }
        count += messages.size;
        let lastTime = new Date(rawMessages.last().createdTimestamp).toISOString().replace(/T/, ' ').replace(/\..+/, '');
        console.log(count + " messages; around " + lastTime);

        if (rawMessages.size < BATCH_SIZE) {
            fs.closeSync(fd);
            process.exit(0);
            break;
        }
    }

}

config = init.loadAuthAndConfig(util);
client = new discord.Client();
client.on('error', console.error);
client.on('ready', e => {
    console.log("Starting.");
    scrapeToJson(client);
});
client.login(config.authToken).catch(error => {
    util.logError(error);
    util.fatalError();
});
