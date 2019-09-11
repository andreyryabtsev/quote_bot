module.exports = (core, message, text) => {
    let user = message.mentions.users.first();
    if (!user) {
        message.channel.send(core.config["quotes"]["author_error"]);
        return;
    }
    core.db.authoredQuotes(user.id, quotes => {
        if (quotes.length > 0) {
            let quote = core.util.simpleRandom(quotes);
            sendQuote(message.channel, quote.content, quote.nickname);
        } else {
            message.channel.send(core.config["quotes"]["quote_error"]);
            return;
        }
    });
}