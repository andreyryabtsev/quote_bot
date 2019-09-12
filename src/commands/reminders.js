module.exports = (core, message) => {
    let discordID = message.author.id;
    core.db.allReminders((reminders) => {
        if (reminders.length == 0) {
            message.channel.send(core.config["reminders"]["output_empty"]);
        } else {
            let output = "```";
            let title = core.config["reminders"]["output_title"];
            output += title ? title + "\n" : "";
            for (let reminder of reminders) {
                let alarmTime = parseInt(reminder.invoked_on) + reminder.delay_seconds * 1000;
                let duration = core.util.formatDuration(alarmTime - Date.now());
                if (reminder.discord_id == discordID) { // print only the reminders belonging to caller
                    output += core.config["reminders"]["output_row"]
                        .replace("{d}", duration)
                        .replace("{n}", reminder.content)
                        + "\n";
                }
            }
            let footer = core.config["reminders"]["output_footer"];
            output += footer ? footer + "```" : "```";
            message.channel.send(output);
        }
    });
}
