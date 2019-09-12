module.exports = (core, message, text) => {
    core.db.lastVote(text, vote => {
        if (!vote) {
            if (text) {
                message.channel.send(core.config["vote"]["search_error"]);
            } else {
                message.channel.send(core.config["vote"]["search_error_blank"]);
            }
        } else {
            // Try to find correct channel, default to current one
            let voteChannel = core.client.channels.get(vote.discord_channel_id) || message.channel;
            voteChannel.fetchMessage(vote.discord_message_id).then(voteMessage => {
                message.channel.send(parseVoteMessage(core, voteMessage, vote));
            }).catch(error => {
                console.error(error);
                message.channel.send(core.config["vote"]["corruption_error"]);
            });
        }
    });
}

// Parse the reactions to a vote and the vote object, constructing a text summary.
let parseVoteMessage = (core, message, voteInfo) => {
    let longestOption = 0, totalVotes = 0;
    let votes = [];
    message.reactions.forEach(reaction => {
        let optionIndex = core.VOTE_REACTIONS.indexOf(reaction.emoji.name);
        if (optionIndex > -1 && optionIndex < voteInfo.options.length) {
            totalVotes += reaction.count - 1;
            let label = voteInfo.options[optionIndex];
            if (label.length > longestOption) longestOption = label.length;
            votes.push({label: label, count: reaction.count - 1});
        }
    });
    let output = "```\n" + voteInfo.content + ":\n";
    for (let vote of votes) {
        let percentage = totalVotes == 0 ? "0.00" : (vote.count / totalVotes * 100).toFixed(2);
        output += vote.label + " ".repeat(longestOption - vote.label.length) + ": " + vote.count + " (" + percentage + "%)\n";
    }
    output += "```";
    return output;
}
