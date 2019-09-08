module.exports = (message, text) => {
    let args = util.args(text);
    if (args.length < 3) {
        message.channel.send(config["vote"]["proposal_error"]);
        return;
    }
    let count = parseInt(args[0]), options = [];
    if (count <= 0 || count > 10 || args.length < count + 1) {
        message.channel.send(config["vote"]["proposal_error"]);
        return;
    }

    let voteString = VOTE_REACTIONS[0] + ": " + args[1];
    for (let i = 0; i < count; i++) {
        options.push(args[i + 1]);
        if (i > 0) voteString += ", " + VOTE_REACTIONS[i] + ": " + options[i];
    }
    let voteName = args.slice(count + 1).join(" ");
    let voteProposalString = config["vote"]["proposal"]
        .replace("{u}", message.member.displayName)
        .replace("{n}", voteName)
        .replace("{v}", voteString);
    message.channel.send(voteProposalString).then(voteMessage => {
        db.addVote(voteName, message.channel.id, voteMessage.id, options, Date.now(), message.author.id, () => {});
        addVoteReactions(voteMessage, 0, options.length);
    });
}