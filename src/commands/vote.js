module.exports = (core, message, text) => {
    let args = core.util.args(text);
    if (args.length < 3) {
        message.channel.send(core.config["vote"]["proposal_error"]);
        return;
    }
    let count = parseInt(args[0]), options = [];
    if (count <= 0 || count > 10 || args.length < count + 1) {
        message.channel.send(core.config["vote"]["proposal_error"]);
        return;
    }

    let voteString = VOTE_REACTIONS[0] + ": " + args[1];
    for (let i = 0; i < count; i++) {
        options.push(args[i + 1]);
        if (i > 0) voteString += ", " + VOTE_REACTIONS[i] + ": " + options[i];
    }
    let voteName = args.slice(count + 1).join(" ");
    let voteProposalString = core.config["vote"]["proposal"]
        .replace("{u}", message.member.displayName)
        .replace("{n}", voteName)
        .replace("{v}", voteString);
    message.channel.send(voteProposalString).then(voteMessage => {
        core.db.addVote(voteName, message.channel.id, voteMessage.id, options, Date.now(), message.author.id, () => {});
        addVoteReactions(voteMessage, 0, options.length);
    });
}

// Recursively iterate over 0..n-1 and add vote reactions sequentially.
let addVoteReactions = (message, i, n) => {
    if (i == n) return;
    message.react(VOTE_REACTIONS[i]).then(r => addVoteReactions(message, i + 1, n));
}

// Parse the reactions to a vote and the vote object, constructing a text summary.
let parseVoteMessage = (message, voteInfo) => {
    let longestOption = 0, totalVotes = 0;
    let votes = [];
    message.reactions.forEach(reaction => {
        let optionIndex = VOTE_REACTIONS.indexOf(reaction.emoji.name);
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
