module.exports = (core, message) => {
    let help = core.util.splitLongMessage(generateHelp());
    for (let msg of help) message.channel.send(msg);
}