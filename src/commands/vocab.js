const VOCAB_WORDS_PER_MESSAGE = 120;

module.exports = (core, message, text) => {
    let args = core.util.args(text), pos = "<" + args[0] + ">";
    let typeID = core.PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 1 || typeID == -1 && args[0] != "all") {
        message.channel.send(core.config["cfg"]["vocab_error"]);
    } else {
        if (args[1] == "count") {
            core.db.countVocab(typeID, count => {
                if (args[0] == "all") args[0] = "word";
                message.channel.send(core.config["cfg"]["vocab_count_response"].replace("{n}", count).replace("{t}", args[0]));
            });
        } else {
            core.db.fetchVocab(typeID, vocab => {
                vocab.sort();
                for (let i = 0; i < vocab.length / VOCAB_WORDS_PER_MESSAGE; i++) {
                    let vocabSlice = vocab.slice(i * VOCAB_WORDS_PER_MESSAGE, (i + 1) * VOCAB_WORDS_PER_MESSAGE);
                    message.channel.send(vocabSlice.join(", "));
                }
            });
        }
    }
}