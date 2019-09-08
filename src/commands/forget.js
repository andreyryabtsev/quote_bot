module.exports = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(config["cfg"]["forget_error"]);
    } else {
        let vocabType = PARTS_OF_SPEECH.indexOf(pos);
        db.forgetVocab(vocabType, args[1], deletions => {
            if (deletions == 0) {
                message.channel.send(config["cfg"]["forget_missing_error"]);
            } else {
                message.react(ACKNOWLEDGEMENT_EMOTE);
            }
        });
    }
}