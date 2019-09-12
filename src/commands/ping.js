module.exports = (core, message) => {
    message.channel.send(core.config["general"]["ping_response"]);
}