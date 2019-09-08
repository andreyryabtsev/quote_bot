module.exports = (message, text) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        db.deleteQuotes(text, () => {
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    });
}