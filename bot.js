const QUOTE_PIN_EMOTE = "📌", ANTI_QUOTE_PIN_EMOTE = "👎";
const QUOTE_PIN_THRESH = 2;


function fillUpTo(message, curr, max) {
    if(curr == max) return;
    message.react(VOTE_REACTS[curr]).then(r=>fillUpTo(r.message, curr + 1, max));
}

client.on('message', (message) => {
    console.log(message.author.username + ": " + message.content);
    if (message.content.substring(0, 1) == '!') {

     } else {
        let lcontent = message.content.toLowerCase();
        if (lcontent.includes("pharmacybot")) {
            hearts = ["💚", "💜", "🖤", "💛", "💙", "❤️"];
            if(lcontent.includes("love pharmacybot") || lcontent.includes("love you pharmacybot")) {
                message.channel.send(config["love_response"]);
            } else {
                message.react(hearts.rand());
            }
        }
     }
});
function reacc(data) {
    if(data["emoji"]["name"] == QUOTE_PIN_EMOTE) {
        client.channels.find('id', data['channel_id']).fetchMessage(data['message_id']).then(message => {
            let antiReaccs = message.reactions.get(ANTI_QUOTE_PIN_EMOTE);
            if(antiReaccs && antiReaccs.users.exists(u => getUserPermission(u.id, "QUOTEKILL"))) return;
            let count = message.reactions.get(QUOTE_PIN_EMOTE).count;
            if(count >= QUOTE_PIN_THRESH) {
                let q = { "u": message.author.id, "t": message.content };
                if(!savedData["quotes"].some((el) => el["t"] == q["t"])) {
                    savedData["quotes"].push(q);
                    save();
                    message.react("👍");
                }
            }
        });
    }
}

client.on('raw', event => {
    if(event["t"] == "MESSAGE_REACTION_ADD") {
        reacc(event["d"]);
    }
});
