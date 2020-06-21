module.exports = (core, message, text) => {
    let id = message.mentions.users.first()
            ? message.mentions.users.first().id
            : message.author.id;
    let args = core.util.args(text);
    let count = args.length >= 1 ? parseInt(args[0]) : 5;
    core.db.recentLogs(id, count, results => {
        let result_lines = [];
        for (let row of results) {
            let time_since = Date.now() - row.created_at, caption = row.content;
            let time_string = core.util.formatDuration(time_since);
            result_lines += time_string + ": " + caption;
        }
        message.channel.send("```\n" + result_lines.join("\n") + "\n```");
    });
}
