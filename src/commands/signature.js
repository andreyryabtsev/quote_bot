module.exports = (core, message, text) => {
    let signature = core.util.args(text)[0];
    core.db.updateSignature(message.author.id, signature, () => {
        message.react(core.ACKNOWLEDGEMENT_EMOTE);
    });
}