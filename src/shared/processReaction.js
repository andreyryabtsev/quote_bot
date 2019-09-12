const QUOTE_PIN_EMOTE = "📌", ANTI_QUOTE_PIN_EMOTE = "👎";

// Potentially invoke the quote pinning process, checking for veto if attempted vetoes are found.
module.exports = (core, event) => {
    if (event.emoji.name == QUOTE_PIN_EMOTE) {
        client = core.client; db = core.db; config = core.config; util = core.util;
        client.channels.get(event.channel_id).fetchMessage(event.message_id).then(message => {
            let opposition = message.reactions.get(ANTI_QUOTE_PIN_EMOTE);
            if (opposition) {
                checkPinOpposition(opposition.users.array(), 0, () => pinQuote(core, message));
            } else {
                pinQuote(core, message);
            }
        });
    }
}

// Recursively iterate over the users who vetoed a quote.
// Only call callback if all these users lack veto permissions.
let checkPinOpposition = (users, i, callback) => {
    if (i == users.length) {
        callback();
    } else {
        db.userPermissions(users[i].id, permissions => {
            if ((permissions & util.permissionValue("QUOTEKILL")) == 0) {
                checkPinOpposition(users, i + 1, callback);
            }
        });
    }
}

// Check if a quote meets the pin threshold and has not already been added.
// If so, add it and update the quote glossary.
let pinQuote = (core, message) => {
    let count = message.reactions.get(QUOTE_PIN_EMOTE).count;
    if (count >= config["quotes"]["pin_threshold"]) {
        db.filteredQuotes(message.content, results => {
            if (results.length == 0) {
                db.addQuote(message.author.id, Date.now(), message.content, () => {
                    message.react(core.ACKNOWLEDGEMENT_EMOTE);
                });
            }
        });
    }
}

var client, db, config, util;
