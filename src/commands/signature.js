module.exports = (message, text) => {
    let signature = util.args(text)[0];
    db.updateSignature(message.author.id, signature, () => {
        message.react(ACKNOWLEDGEMENT_EMOTE);
    });
}