module.exports = (core, message, text) => {
    let split = text.split("```");
    let name = split[0].trim();
    let code = split[1].trim();
    code = code.replace(/^(js|javascript)/g, "").trim();
    code = "module.exports = (cells, newCells, s, helpers) => {\n" + code + "\n}";
    core.fs.writeFileSync("src/automata/" + name + ".js", code);
    core.automata[name] = eval(code);
    message.react(core.ACKNOWLEDGEMENT_EMOTE);
}