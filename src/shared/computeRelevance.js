module.exports = (core, message, sendIfRelevant) => {
    let n = core.config["quotes"]["relevancy_params"]["message_count"],
        e = core.config["quotes"]["relevancy_params"]["exponentiation"],
        p = core.config["quotes"]["relevancy_params"]["weight"];
    message.channel.fetchMessages({ limit: n * 10, before: message.id}).then(messages => {
        core.db.allQuotes(quotes => {
            if (quotes.length == 0) {
                message.channel.send(core.config["quotes"]["quote_error"]);
                return;
            }
            let minTime = Math.min(...quotes.map(quote => {
                return !parseInt(quote.called_at) ? Infinity : parseInt(quote.called_at);
            }));
            let quoteGlossary = buildQuoteGlossary(core, quotes);
            let recentGlossary = {};
            messages = messages.array();
            let count = 0;
            for (let i = 0; i < n*10; i++) {
                if (!messages[i].author.bot && !messages[i].content.startsWith("!")) {
                    let words = core.util.toWords(messages[i].content);
                    if (words.length > 1) {
                        for (let word of words) {
                            if (!(word in recentGlossary)) recentGlossary[word] = 0;
                            recentGlossary[word] += n - count;
                        }
                        if (++count >= n) break;
                    }
                }
            }
            if (Object.keys(recentGlossary).length == 0) {
                let quote = core.util.simpleRandom(quotes);
                if (!sendIfRelevant) {
                    core.shared.sendQuote(message.channel, quote.content, quote.nickname);
                }
                return;
            }
            let weightSum = 0.0;
            quotes = quotes.map(quote => {
                let rank = 0.0;
                core.util.toWords(quote.content).forEach(word => {
                    if (quoteGlossary[word]) { //todo: figure out why there are quotes whose core.util.toWords is not a subset of quoteGlossary
                        rank += (recentGlossary[word] || 0.0) / quoteGlossary[word];
                    }
                });
                timeRatio = !parseInt(quote.called_at) ? 1 : ((Date.now() - parseInt(quote.called_at)) / (Date.now() - minTime));
                rank = timeRatio * Math.pow(rank, e);
                weightSum += rank;
                return {value: quote, weight: rank};
            }).map(quote => {
                let processedWeight = p * quote.weight / weightSum + (1 - p) / quotes.length;
                return {value: quote.value, weight: processedWeight};
            });

            quotes.sort((a,b) => b.weight - a.weight); // sort and report quotes for debug purposes
            for (let i = 0; i < Math.min(5, quotes.length); i++) console.log("[relevant_quotes]: " + quotes[i].value.content + ": " + quotes[i].weight);
            let quote = sendIfRelevant ? quotes[0].value : core.util.weightedRandom(quotes);
            if (!sendIfRelevant || (quotes[0].weight + Math.random()) > 1.3) {
                core.shared.sendQuote(message.channel, quote.content, quote.nickname);
            }
        });
    });
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
