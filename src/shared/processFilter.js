// Match a message against the filter list; delete, reply, and return true iff matched.
module.exports = (core, message) => {
    for (let regex of core.filter) {
        if (regex.test(message.content)) {
            message.delete().then(msg => {
                message.channel.send(core.config["etc"]["filter_reply"].replace("{u}", message.member.displayName))
                    .then(message => message.delete(core.config["etc"]["message_delete_wait"]));
            });
            return true;
        }
    }
    return false;
}