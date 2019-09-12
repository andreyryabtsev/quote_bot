module.exports = (core, message, text) => {
    let args = core.util.args(text), pos = "<" + args[0] + ">";
    let typeID = core.PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(core.config["cfg"]["forget_error"]);
    } else {
        let vocabType = core.PARTS_OF_SPEECH.indexOf(pos);
        core.db.forgetVocab(vocabType, args[1], deletions => {
            if (deletions == 0) {
                message.channel.send(core.config["cfg"]["forget_missing_error"]);
            } else {
                message.react(core.ACKNOWLEDGEMENT_EMOTE);
            }
        });
    }
}