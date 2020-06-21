// Scan for reminders frequently and post + delete expired ones
module.exports = (core) => {
    let toDelete = [], toBump = [], bumpSeconds = [], now = Date.now();
    for (let i = core.reminders.length - 1; i >= 0; i--) {
        let reminder = core.reminders[i];
        let expiry = parseInt(reminder.start) + reminder.seconds * 1000;
        if (expiry <= now) {
            // if late by more than double polling rate, likely offline
            let template = expiry <= now - core.REMINDER_POLLING_RATE * 2000
                ? core.config["reminders"]["late_reminder"]
                : core.config["reminders"]["reminder"];
            core.client.channels.get(reminder.channelID).send(template
                .replace("{u}", "<@" + reminder.discordID + ">")
                .replace("{n}", reminder.note));
            if (reminder.repeatSeconds > 0) {
                reminder.start = now;
                reminder.seconds = reminder.repeatSeconds;
                toBump.push(reminder.id);
                bumpSeconds.push(reminder.seconds);
            } else {
                core.reminders.splice(i, 1);
                toDelete.push(reminder.id);
            }
        }
    }
    if (toDelete.length > 0) core.db.deleteReminders(toDelete, () => {});
    if (toBump.length > 0) core.db.bumpReminders(toBump, bumpSeconds, now, () => {});
};
