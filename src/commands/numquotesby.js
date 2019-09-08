module.exports = (message, text) => {
    let users = message.mentions.users.map(u => u.id);
    if (!users) {
        message.channel.send(config["quotes"]["num_author_error"]);
        return;
    }
    db.filteredUserQuotes(users, quotes => {
        message.channel.send(config["quotes"]["num_quotes"].replace("{n}", quotes.length));
    });
}