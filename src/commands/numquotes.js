module.exports = (core, message, text) => {
    core.db.filteredQuotes(text, quotes => {
        message.channel.send(core.config["quotes"]["num_quotes"].replace("{n}", quotes.length));
    });
}