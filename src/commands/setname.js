module.exports = (message, text) => {
    let user = message.mentions.users.first() || message.author,
        newName = message.mentions.users.first() ? text.substring(text.indexOf(" ") + 1) : text;
    db.updateNickname(user.id, newName, () => {
        message.react(ACKNOWLEDGEMENT_EMOTE);
    });
}