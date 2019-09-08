module.exports = (message, text) => {
    let numDays = parseInt(util.args(text)[0]);
    if (!(numDays > 0 && numDays <= 365)) {
        message.channel.send(config["logs"]["chart_error"]);
    } else {
        let mentionUsers = message.mentions.users.array(), mentionMembers = message.mentions.members.array();
        if (mentionUsers.length == 0) {
            mentionUsers = [message.author];
            mentionMembers = [message.member];
        }
        produceChart(message.channel, mentionUsers, mentionMembers, numDays);
    }
}