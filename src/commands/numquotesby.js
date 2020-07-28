module.exports = (core, message, text) => {
    let users = message.mentions.users.map(u => u.id);
    if (!users || !users[0]) {
        message.channel.send(core.config["quotes"]["num_author_error"]);
        return;
    }
    core.db.filteredUserQuotes(users, quotes => {
        message.channel.send(core.config["quotes"]["num_quotes"].replace("{n}", quotes.length));
    });
}