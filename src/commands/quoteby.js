module.exports = (message, text) => {
    let user = message.mentions.users.first();
    if (!user) {
        message.channel.send(config["quotes"]["author_error"]);
        return;
    }
    db.authoredQuotes(user.id, quotes => {
        if (quotes.length > 0) {
            let quote = util.simpleRandom(quotes);
            sendQuote(message.channel, quote.content, quote.nickname);
        } else {
            message.channel.send(config["quotes"]["quote_error"]);
            return;
        }
    });
}