var util;
module.exports = (core, message, text) => {
    util = core.util;
    let n = parseInt(util.args(text)[0]);
    if (!(n > 0 && n <= 25)) n = 1;
    getCFGSentences(core, n, sentences => {
        let output = "";
        for (let sentence of sentences) {
            output += sentence + "\n";
        }
        message.channel.send(output);
    }, true);
}

let updateVocabCache = (core, i, callback) => {
    if (i >= core.PARTS_OF_SPEECH.length) {
        callback();
        return;
    }
    if (i == 0) {
        if (core.vocabUpdate && Date.now() - core.vocabUpdate < 20000) {
            callback();
            return;
        }
        core.vocabCache = [];
        for (let i = 0; i < core.PARTS_OF_SPEECH.length; i++) {
            core.vocabCache[i] = [];
        }
    }
    core.db.fetchVocab(i, vocab => {
        core.vocabCache[i] = vocab;
        updateVocabCache(core, i + 1, callback);
    });
}

// CFG: Get a number of sentences by recursively iterating across n and saving each sentence to cache.
let getCFGSentence = (core, callback) => {
    let punct = util.simpleRandom([".", ".", ".", "...", "!"]);
    updateVocabCache(core, 0, () => {
        let raw = parseCFG(core, "<sentence>");
        let final = raw.charAt(0).toUpperCase() + raw.slice(1) + punct;
        callback(final);
    });
}
let sentencesCache = [];
let getCFGSentences = (core, n, callback, init) => {
    if (init) sentencesCache = [];
    if (n == 0) {
        callback(sentencesCache);
    } else {
        getCFGSentence(core, sentence => {
            sentencesCache.push(sentence);
            getCFGSentences(core, n - 1, callback, false);
        });
    }
}

let parseCFG = (core, tk) => {
    return tk.replace(/<[^>]*>/g, function(token) {
        if (token in RECURSIVE_TOKENS) {
            let list = RECURSIVE_TOKENS[token];
            return parseCFG(core, util.simpleRandom(list));
        }
        let typeID = core.PARTS_OF_SPEECH.indexOf(token);
        if (typeID > -1) {
            return util.simpleRandom(core.vocabCache[typeID]) || token;
        }
        return token;
    });
}

const RECURSIVE_TOKENS = {
    "<sentence>": ["<simple_sentence>", "<simple_sentence>", "<compound_sentence>"],
    "<simple_sentence>" : ["<noun_phrase> <verb_phrase>"],
    "<compound_sentence>" : ["<simple_sentence> and <simple_sentence>"],
    "<noun_phrase>": ["<article_particle> <adjective_phrase> <noun>", "<p_noun>"],
    "<adjective_phrase>": ["<adjective>", "<adjective>", "<adjective> <adjective_phrase>"],
    "<verb_phrase>": ["<trans_verb_particle> <noun_phrase>", "<i_verb_particle>"],
    "<trans_verb_particle>": ["<trans_verb>", "<adverb> <trans_verb>"],
    "<i_verb_particle>": ["<i_verb>", "<adverb> <i_verb>", "<i_verb> <adverb>"],
    "<article_particle>": ["<article>", "<p_noun>'s"]
};
