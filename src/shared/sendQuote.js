module.exports = (core, channel, content, author) => {
    channel.send(core.config["quotes"]["format"].replace("{q}", content).replace("{u}", author));
    core.db.updateQuote(content, Date.now());
}