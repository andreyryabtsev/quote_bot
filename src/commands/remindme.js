module.exports = (core, message, text) => {
    let args = core.util.args(text);
    if (args.length < 1) {
        message.channel.send(core.config["reminders"]["format_error"]);
        return;
    }
    let txtIn, txtThereafter = undefined;
    let repeating = 0;
    if (args[0] === "repeating") {
        repeating = core.util.timeToSecs(args[1]);
        txtThereafter = args[1];
        args = args.slice(2);
    }
    txtIn = args[0];
    let seconds = core.util.timeToSecs(args[0]),
        note = args.slice(1).join(" "),
        now = Date.now();
    if (seconds == null || repeating == null) {
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
            if (repeating > 0) {
                txtIn += " (and every " + txtThereafter + " thereafter)";
            }
            message.channel.send(core.config["reminders"]["confirmation"].replace("{u}", message.member.displayName).replace("{i}", txtIn).replace("{id}", results.insertId));
        });
    }
}
