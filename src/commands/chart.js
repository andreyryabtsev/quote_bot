const msInDay = 86400000;

module.exports = (core, message, text) => {
    let numDays = parseInt(core.util.args(text)[0]);
    if (!(numDays > 0 && numDays <= 365)) {
        message.channel.send(core.config["logs"]["chart_error"]);
    } else {
        let mentionUsers = message.mentions.users.array(), mentionMembers = message.mentions.members.array();
        if (mentionUsers.length == 0) {
            mentionUsers = [message.author];
            mentionMembers = [message.member];
        }
        produceChart(core, message.channel, mentionUsers, mentionMembers, numDays);
    }
}

// Process all logged events for the selected users and computes the number of days ago they were produced
// Then, write results to ./chart/chartdata and invoke the python visualizer, sending image to channel.
let produceChart = (core, channel, users, members, days) => {
    core.db.allLogs(users.map(user => user.id), Date.now() - days * msInDay, results => {
        let usersToLogs = {};
        for (let row of results) {
            if (usersToLogs[row.nickname] == undefined) usersToLogs[row.nickname] = [];
            usersToLogs[row.nickname].push(Math.floor((Date.now() - row.created_at) / msInDay));
        }
        let chartfile = days + "\n";
        for (let nickname in usersToLogs) {
            chartfile += nickname + "\n" + usersToLogs[nickname].join(" ") + "\n";
        }
        core.fs.writeFileSync("chart/chartdata", chartfile, 'utf8');
        core.cp.exec("python3 chart/chartgen.py chart/", (error, stdout, stderr) => {
            if (error) core.util.logError("[chartgen] ERROR: " + error);
            if (stdout) console.log("[chartgen] " + stdout);
            if (stderr) core.util.logError("[chartgen] " + stderr);
            channel.send({
                files: [{
                    attachment: 'chart/chart.png',
                    name: 'botchart.png'
                }]
            })
        });
    });
}
