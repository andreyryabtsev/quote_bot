module.exports = (core, message, text) => {
    let user = message.mentions.users.first() || message.author,
        newName = message.mentions.users.first() ? text.substring(text.indexOf(" ") + 1) : text;
    core.db.updateNickname(user.id, newName, () => {
        message.react(core.ACKNOWLEDGEMENT_EMOTE);
    });
}