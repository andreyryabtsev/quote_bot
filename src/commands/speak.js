module.exports = (message, text) => {
    let n = parseInt(util.args(text)[0]);
    if (!(n > 0 && n <= 25)) n = 1;
    getCFGSentences(n, sentences => {
        let output = "";
        for (let sentence of sentences) {
            output += sentence + "\n";
        }
        message.channel.send(output);
    }, true);
}