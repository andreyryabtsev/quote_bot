const REPLACEMENT_MAP = {
    " my ":" your ", " your ":" my ",
    " myself ":" yourself ", " yourself ":" myself ",
    " you ":" me ", " me ":" you "
};
const MARKERS = [": ", "choose between ", "choose from ", "choose ", "would you rather "];

let markerRegex = new RegExp("^.*(" + MARKERS.join("|") + ")", "g"),
    replacementRegex = new RegExp(Object.keys(REPLACEMENT_MAP).join("|"), "g");

module.exports = (core, message) => {
    if (message.author.bot) return;
    let config = core.config, util = core.util, text = message.content.toLowerCase();
    if (text.startsWith("bot") || text.startsWith(config["general"]["bot_name"])) {
        if (markerRegex.test(text)) { // continues if the input contains one of the keywords
            text = text.replace(/(, or | or )/g, ", ");
            MARKERS.forEach(marker => {
                let i = text.indexOf(marker);
                if (i >= 0) text = text.slice(i + marker.length);
            });
            let choices = text.split(", ").map(word => {
                if (word.endsWith("?") || word.endsWith(".")) word = word.slice(0, word.length - 1);
                word = " " + word + " ";
                return word.replace(replacementRegex, match => replacements[match.toLowerCase()]).trim();
            });
            let output = core.util.simpleRandom(choices);
            message.channel.send(output.charAt(0).toUpperCase() + output.slice(1) + "!");
        } else if (text.endsWith("?")) {
            if (text.includes("percent") || text.includes("%")) {
                message.channel.send(Math.floor(Math.random() * 101) + "%!");
            } else {
                message.channel.send((Math.random() < 0.5) ? "Yes!" : "No!");
            }
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