module.exports = (message) => {
    util.getPermission(db, message.author.id, "ADMIN", message.channel, config["general"]["permission_denied_error"], () => {
        let member = message.mentions.members.first();
        if (member) {
            member.setVoiceChannel(member.guild.afkChannel);
        }
    });
}