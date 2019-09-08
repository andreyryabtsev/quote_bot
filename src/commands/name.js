module.exports = (message) => {
    let id = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id;
    let displayName = message.mentions.members.first() ? message.mentions.members.first().displayName : message.member.displayName;
    db.quoteName(id, quoteName => {
        if (!quoteName) message.channel.send(config["quotes"]["name_error"]);
        else message.channel.send(config["quotes"]["name_response"].replace("{u}", displayName).replace("{n}", quoteName));
    });
}