module.exports = (core, message) => {
    let help = core.util.splitLongMessage(generateHelp(core));
    for (let msg of help) message.channel.send(msg);
}

// Uses config to generate a help message for the bot functionality
let generateHelp = (core) => {
    let helpLines = [core.config["help"]["header"] + "\n"];
    let items = Object.keys(core.config["help_items"]).sort();
    for (let item of items) {
        helpLines.push(item + " - " + core.config["help_items"][item] + "\n");
    }
    return helpLines;
}
