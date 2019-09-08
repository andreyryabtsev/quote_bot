module.exports = (message, text) => {
    let numCoins = parseInt(util.args(text)[0]);
    if (isNaN(numCoins) || numCoins < 1) numCoins = 1;
    if (numCoins > config["etc"]["max_coins"]) {
        message.channel.send(config["etc"]["coin_error"]);
        return;
    }
    let heads = 0;
    for (let i = 0; i < numCoins; i++) if (Math.random() > 0.5) heads++;
    if (numCoins == 1) message.channel.send(heads == 1 ? "Heads!" : "Tails!");
    else message.channel.send(config["etc"]["coin_output_many"].replace("{n}", heads));
}