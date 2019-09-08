module.exports = (message, text) => {
    let args = util.args(text), pos = "<" + args[0] + ">";
    let typeID = PARTS_OF_SPEECH.indexOf(pos);
    if (args.length < 1 || typeID == -1 && args[0] != "all") {
        message.channel.send(config["cfg"]["vocab_error"]);
    } else {
        if (args[1] == "count") {
            db.countVocab(typeID, count => {
                if (args[0] == "all") args[0] = "word";
                message.channel.send(config["cfg"]["vocab_count_response"].replace("{n}", count).replace("{t}", args[0]));
            });
        } else {
            db.fetchVocab(typeID, vocab => {
                vocab.sort();
                for (let i = 0; i < vocab.length / VOCAB_WORDS_PER_MESSAGE; i++) {
                    let vocabSlice = vocab.slice(i * VOCAB_WORDS_PER_MESSAGE, (i + 1) * VOCAB_WORDS_PER_MESSAGE);
                    message.channel.send(vocabSlice.join(", "));
                }
            });
        }
    }
}