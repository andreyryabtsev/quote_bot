const QUOTE_PIN_EMOTE = "📌", ANTI_QUOTE_PIN_EMOTE = "👎", VOTE_REACTS = ["\u0031\u20E3","\u0032\u20E3","\u0033\u20E3","\u0034\u20E3","\u0035\u20E3", "\u0036\u20E3","\u0037\u20E3","\u0038\u20E3","\u0039\u20E3", "\u0030\u20E3"];
const QUOTE_PIN_THRESH = 2;


function fillUpTo(message, curr, max) {
    if(curr == max) return;
    message.react(VOTE_REACTS[curr]).then(r=>fillUpTo(r.message, curr + 1, max));
}

client.on('message', (message) => {
    console.log(message.author.username + ": " + message.content);
    if (message.content.substring(0, 1) == '!') {
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);
        switch(cmd) {
            case 'vote': // !vote 2 A B name of vote
                ensureUser(message.author.id);
                let count = parseInt(args[0]), options = [];
                if (count <= 0 || count > 10 || args.length < count + 1) {
                    message.channel.send(config["vote_error"]);
                    return;
                }
                let voteString = VOTE_REACTS[0] + ": " + args[1];
                for (let i = 0; i < count; i++) {
                    options.push(args[i + 1]);
                    if(i > 0) voteString += ", " + VOTE_REACTS[i] + ": " + options.last();
                }
                let vote = {
                    createdAt: Date.now(),
                    author: message.author.id,
                    name: args.slice(count + 1).join(" "),
                    options: options
                };
                let voteProposalString = config["vote_proposal"]
                    .replace("{u}", message.member.displayName)
                    .replace("{n}", vote.name)
                    .replace("{v}", voteString);
                message.channel.send(voteProposalString).then(m=>{
                    vote["messageId"] = m.id;
                    savedData["votes"].push(vote);
                    save();
                    fillUpTo(m, 0, vote.options.length);
                });
                break;
            case 'votestatus':
                let voteF = false;
                if(args.length > 0) {
                    let name = args.join(" ");
                    voteF = savedData["votes"].find(v=>v.name === name);
                    if(!voteF) {
                        message.channel.send("vote_search_error");
                        return;
                    }
                } else {
                    voteF = savedData["votes"].last();
                    if(!voteF) {
                        message.channel.send(config["votes_empty_error"]);
                        return;
                    }
                }
                message.channel.fetchMessage(voteF.messageId).then(m=>{
                    let totalCount = 0, maxLength = 0;
                    let rawReacts = m.reactions.filter(r=> {
                        let idx = VOTE_REACTS.indexOf(r.emoji.name);
                        return idx > -1 && idx < voteF.options.length;
                    });
                    let votes = rawReacts.map(r=>{
                        totalCount += r.count - 1;
                        let label = voteF.options[VOTE_REACTS.indexOf(r.emoji.name)];
                        if(label.length > maxLength) maxLength = label.length;
                        return {count: r.count - 1, label: label};
                    });
                    let outputString = "```\n" + voteF.name + ":\n";
                    for(let i = 0; i < votes.length; i++) {
                        let percentage = (votes[i].count / totalCount * 100).toFixed(2);
                        outputString += votes[i].label + " ".repeat(maxLength - votes[i].label.length) + ": " + votes[i].count + " (" + percentage + "%)\n";
                    }
                    outputString += "```";
                    message.channel.send(outputString);
                });
                break;
            default:
                let plain_response = config["plain_responses"][cmd];
                if (plain_response !== undefined)
                    message.channel.send(plain_response);
                break;
         }
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

client.login(auth.token);

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

if (!Array.prototype.rand){
    Array.prototype.rand = function(){
        return this[randInt(this.length)];
    };
};
load();

