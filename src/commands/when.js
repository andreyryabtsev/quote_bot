module.exports = (message, text) => {
    let id = message.mentions.users.first()
            ? message.mentions.users.first().id
            : message.author.id,
        nickname = message.mentions.members.first()
            ? message.mentions.members.first().displayName
            : message.member.displayName;
    db.lastLog(id, (logInfo) => {
        if (logInfo) {
            let duration = util.formatDuration(Date.now() - logInfo.lastLog);
            message.channel.send(config["logs"]["when_response"].replace("{d}", duration).replace("{u}", nickname).replace("{s}", logInfo.signature));
        } else {
            message.channel.send(config["logs"]["when_error"].replace("{u}", nickname));
        }
    });
}