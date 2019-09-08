module.exports = (message, text) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        let count = parseInt(util.args(text)[0]);
        if (count <= 0 || count > 100) {
            message.channel.send(config["clear"]["error"]);
        } else {
            message.channel.bulkDelete(count + 1).then(messages => {
                message.channel.send(config["clear"]["response"].replace("{n}", count))
                .then(message => message.delete(config["etc"]["message_delete_wait"]));
            });
        }
    });
};