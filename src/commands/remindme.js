module.exports = (core, message, text) => {
    let args = core.util.args(text);
    if (args.length < 1) {
        message.channel.send(core.config["reminders"]["format_error"]);
        return;
    }
    let repeating = 0;
    if (args[0] === "repeating") {
        repeating = core.util.timeToSecs(args[1]);
        args = args.slice(2);
    }
    let seconds = core.util.timeToSecs(args[0]),
        note = text.substring(text.indexOf(" ") + 1),
        now = Date.now();
    if (note === text) note = "";
    if (seconds === null) {
        message.channel.send(core.config["reminders"]["format_error"]);
    } else {
        core.db.addReminder(message.author.id, message.channel.id, now, note, seconds, repeating, (results) => {
            core.reminders.push({
                id: results.insertId,
                channelID: message.channel.id,
                discordID: message.author.id,
                start: now,
                seconds: seconds,
                repeatSeconds: repeating,
                note: note
            });
            message.react(core.ACKNOWLEDGEMENT_EMOTE);
        });
    }
}
