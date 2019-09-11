module.exports = (core, message, text) => {
    let args = core.util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 2 || typeID == -1) {
        message.channel.send(core.config["cfg"]["teach_error"]);
    } else {
        let word = text.substring(text.indexOf(" ") + 1);
        core.db.checkVocab(typeID, word, exists => {
            if (exists) {
                message.channel.send(core.config["cfg"]["teach_present_error"]);
            } else {
                core.db.addVocab(typeID, word, () => {
                    message.react(ACKNOWLEDGEMENT_EMOTE);
                });
            }
        });
    }
}