module.exports = (message) => {
    util.getPermission(db, message.author.id, "UNDO", message.channel, config["general"]["permission_denied_error"], () => {
        db.deleteLastLog(message.author.id, rowsAffected => {
            if (rowsAffected > 0) {
                message.channel.send(config["logs"]["undo_response"].replace("{u}", message.member.displayName));
            } else {
                message.channel.send(config["logs"]["undo_error"]);
            }
        });
    });
}