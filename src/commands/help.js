module.exports = (message) => {
    let help = util.splitLongMessage(generateHelp());
    for (let msg of help) message.channel.send(msg);
}