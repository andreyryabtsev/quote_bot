module.exports = (core, message, text) => {
    let id = message.mentions.users.first()
            ? message.mentions.users.first().id
            : message.author.id,
        nickname = message.mentions.members.first()
            ? message.mentions.members.first().displayName
            : message.member.displayName;
    core.db.lastLog(id, (logInfo) => {
        if (logInfo) {
            let duration = core.util.formatDuration(Date.now() - logInfo.lastLog);
            message.channel.send(core.config["logs"]["when_response"].replace("{d}", duration).replace("{u}", nickname).replace("{s}", logInfo.signature));
        } else {
            message.channel.send(core.config["logs"]["when_error"].replace("{u}", nickname));
        }
    });
}