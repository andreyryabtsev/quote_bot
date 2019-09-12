module.exports = (core, message, text) => {
    core.util.getPermission(core.db, message.author.id, "ADMIN", message.channel, core.config["general"]["permission_denied_error"], () => {
        core.db.deleteQuotes(text, () => {
            message.react(core.ACKNOWLEDGEMENT_EMOTE);
        });
    });
}