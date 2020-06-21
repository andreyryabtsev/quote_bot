module.exports = (core, message) => {
    let discordID = message.author.id;
    core.db.allReminders((reminders) => {
        if (reminders.length == 0) {
            message.channel.send(core.config["reminders"]["output_empty"]);
        } else {
            let callerReminders = reminders.filter(r => r.discord_id == discordID)
                .map(reminder => {
                    let alarmTime = parseInt(reminder.invoked_on) + reminder.delay_seconds * 1000;
                    reminder.duration = alarmTime - Date.now();
                    return reminder;
                })
                .sort((r1, r2) => r1.duration - r2.duration);
            let output = "```";
            let title = core.config["reminders"]["output_title"];
            output += title ? 
                title.replace("{n}", callerReminders.length)
                .replace("{p}", callerReminders.length > 0 ? "s" : "") + "\n" : "";
            for (let reminder of callerReminders) {
                let duration = core.util.formatDuration(reminder.duration);
                output += core.config["reminders"]["output_row"]
                    .replace("{id}", reminder.id)
                    .replace("{d}", duration)
                    .replace("{n}", reminder.content)
                    + "\n";
            }
            let footer = core.config["reminders"]["output_footer"];
            output += footer ? footer + "```" : "```";
            message.channel.send(output);
        }
    });
}