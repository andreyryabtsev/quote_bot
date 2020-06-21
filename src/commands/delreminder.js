module.exports = (core, message, text) => {
    let id = parseInt(core.util.args(text)[0]), ownerID = false, ephemeralID = -1;
    for (let i = 0; i < core.reminders.length; i++) {
        let reminder = core.reminders[i];
        if (reminder.id === id) {
            ownerID = reminder.discordID;
            ephemeralID = i;
            break;
        }
    }
    if (ownerID && ownerID === message.author.id) {
        core.reminders.splice(ephemeralID, 1);
        core.db.deleteReminders([id], () => {});
        message.react(core.ACKNOWLEDGEMENT_EMOTE);
    } else {
        message.channel.send(core.config["reminders"]["foreign_error"]);
    }
}