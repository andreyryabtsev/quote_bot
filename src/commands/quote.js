module.exports = (core, message, text) => {
    if (text) {
        core.db.filteredQuotes(text, quotes => {
            if (quotes.length > 0) {
                let quote = core.util.simpleRandom(quotes);
                core.shared.sendQuote(message.channel, quote.content, quote.nickname);
            } else {
                message.channel.send(core.config["quotes"]["quote_error"]);
                return;
            }
        });
    } else {
        shared.computeRelevance(message, false);
    }
}

let buildQuoteGlossary = (core, quotes) => {
    quoteGlossary = {};
    quotes.forEach(quote => {
        core.util.toWords(quote.content).forEach(word => {
            if (!(word in quoteGlossary)) quoteGlossary[word] = 0;
            quoteGlossary[word]++;
        });
    });
    return quoteGlossary;
}
