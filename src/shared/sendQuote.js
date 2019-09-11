let sendQuote = (channel, content, author) => {
    channel.send(config["quotes"]["format"].replace("{q}", content).replace("{u}", author));
    db.updateQuote(content, Date.now());
}