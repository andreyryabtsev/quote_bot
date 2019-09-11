module.exports = (core, message, text) => {
    core.util.getPermission(core.db, message.author.id, "ADMIN", message.channel, core.config["general"]["permission_denied_error"], () => {
        let count = parseInt(core.util.args(text)[0]);
        if (count <= 0 || count > 100) {
            message.channel.send(core.config["clear"]["error"]);
        } else {
            message.channel.bulkDelete(count + 1).then(messages => {
                message.channel.send(core.config["clear"]["response"].replace("{n}", count))
                .then(message => message.delete(core.config["etc"]["message_delete_wait"]));
            });
        }
    });
};