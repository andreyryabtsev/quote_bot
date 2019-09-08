module.exports = (message, text) => {
    db.lastVote(text, vote => {
        if (!vote) {
            if (text) {
                message.channel.send(config["vote"]["search_error"]);
            } else {
                message.channel.send(config["vote"]["search_error_blank"]);
            }
        } else {
            // Try to find correct channel, default to current one
            let voteChannel = client.channels.get(vote.discord_channel_id) || message.channel;
            voteChannel.fetchMessage(vote.discord_message_id).then(voteMessage => {
                message.channel.send(parseVoteMessage(voteMessage, vote));
            }).catch(error => {
                message.channel.send(config["vote"]["corruption_error"]);
            });
        }
    });
}