module.exports = (core, message) => {
    let config = core.config, util = core.util, text = message.content.toLowerCase();
    if ((text.startsWith("bot") || text.startsWith(config["general"]["bot_name"])) && text.endsWith("?")) {
        if (text.includes("percent") || text.includes("%")) {
            message.channel.send(Math.floor(Math.random() * 101) + "%!");
        } else {
            message.channel.send((Math.random() < 0.5) ? "Yes!" : "No!");
        }
    } else if (text.includes(config["general"]["bot_name"])) {
        hearts = ["💚", "💜", "🖤", "💛", "💙", "❤️"];
        let affections = ["love " + config["bot_name"], "love you " + config["general"]["bot_name"], "love u " + config["general"]["bot_name"]];
        if (affections.some(affection => text.includes(affection))) {
            message.channel.send(config["general"]["love_response"]);
        } else {
            message.react(util.simpleRandom(hearts));
        }
    }
}