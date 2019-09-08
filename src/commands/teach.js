module.exports = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(config["cfg"]["teach_error"]);
    } else {
        let word = text.substring(text.indexOf(" ") + 1);
        db.checkVocab(typeID, word, exists => {
            if (exists) {
                message.channel.send(config["cfg"]["teach_present_error"]);
            } else {
                db.addVocab(typeID, word, () => {
                    message.react(ACKNOWLEDGEMENT_EMOTE);
                });
            }
        });
    }
}