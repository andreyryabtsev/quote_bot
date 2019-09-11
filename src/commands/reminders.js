module.exports = (message, text) => {
    let seconds = util.timeToSecs(util.args(text)[0]),
        note = text.substring(text.indexOf(" ") + 1),
        now = Date.now();
    if (note === text) note = "";
    if (seconds === null) {
        message.channel.send(config["reminders"]["format_error"]);
    } else {
        db.addReminder(message.author.id, message.channel.id, now, note, seconds, (results) => {
            reminders.push({
                id: results.insertId,
                channelID: message.channel.id,
                discordID: message.author.id,
                start: now,
                seconds: seconds,
                note: note
            });
            message.react(ACKNOWLEDGEMENT_EMOTE);
        });
    }
}
