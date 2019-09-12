module.exports = (core, message) => {
    core.util.getPermission(core.db, message.author.id, "ADMIN", message.channel, core.config["general"]["permission_denied_error"], () => {
        let member = message.mentions.members.first();
        if (member) {
            member.setVoiceChannel(member.guild.afkChannel);
        }
    });
}