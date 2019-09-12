module.exports = (core, message) => {
    core.util.getPermission(core.db, message.author.id, "UNDO", message.channel, core.config["general"]["permission_denied_error"], () => {
        core.db.deleteLastLog(message.author.id, rowsAffected => {
            if (rowsAffected > 0) {
                message.channel.send(core.config["logs"]["undo_response"].replace("{u}", message.member.displayName));
            } else {
                message.channel.send(core.config["logs"]["undo_error"]);
            }
        });
    });
}