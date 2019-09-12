module.exports = (core, message, text) => {
    if (!message.mentions.users.first()) {
        message.channel.send(core.config["quotes"]["add_error"]);
    } else {
        let content = text.substring(text.indexOf(" ") + 1);
        core.db.addQuote(message.mentions.users.first().id, Date.now(), content, () => {
            message.react(core.ACKNOWLEDGEMENT_EMOTE);
        });
    }
}