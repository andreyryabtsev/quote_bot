module.exports = (core, message, text) => {
    core.db.addLog(message.author.id, Date.now(), text, () => {
        message.channel.send(core.config["logs"]["log_response"].replace("{u}", message.member.displayName));
    });
}