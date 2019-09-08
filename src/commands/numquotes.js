module.exports = (message, text) => {
    db.filteredQuotes(text, quotes => {
        message.channel.send(config["quotes"]["num_quotes"].replace("{n}", quotes.length));
    });
}