module.exports = (message, text) => {
    if (!message.mentions.users.first()) {
        message.channel.send(config["quotes"]["add_error"]);
    } else {
        let content = text.substring(text.indexOf(" ") + 1);
        db.addQuote(message.mentions.users.first().id, Date.now(), content, () => {
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    }
}