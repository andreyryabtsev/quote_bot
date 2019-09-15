const T = 300, p = 0.7, WAIT = 3000;

module.exports = (core, message, text) => {
    let args = core.util.args(text),
        s = parseInt(args[0]),
        name = args.length > 1 ? args[1] : "game of life";
    if (isNaN(s) || s < 2 || s > 35) {
        message.channel.send("no fuck you");
        return;
    }
    let cells = [];
    for (let x = 0; x < s; x++) {
        cells.push([]);
        for (let y = 0; y < s; y++) {
            cells[x].push(Math.random() > p ? true : false);
        }
    }
    let automaton = { iteration: 1, ruleset: name, cells };
    message.channel.send(drawWorld(automaton)).then(message => {
        automate(core, automaton, message);
    });
}

let drawWorld = (automaton) => {
    let cells = automaton.cells, iteration = automaton.iteration;
    let content = "```";
    for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells.length; c++) {
            content += cells[r][c] ? "▦" : "▢";
        }
        if (r == 0) content += iteration + "/" + T;
        content += "\n";
    }
    content += "```";
    return content;
}

let helpers = {
    neighbors: (cells, r, c) => {
        let s = cells.length,
            n = 0;
        if (r > 0) {
            if (c > 0) {
                n += cells[r - 1][c - 1] ? 1 : 0;
            }
            if (c < s - 1) {
                n += cells[r - 1][c + 1] ? 1 : 0;
            }
            n += cells[r - 1][c] ? 1 : 0;
        }
        if (r < s - 1) {
            if (c > 0) {
                n += cells[r + 1][c - 1] ? 1 : 0;
            }
            if (c < s - 1) {
                n += cells[r + 1][c + 1] ? 1 : 0;
            }
            n += cells[r + 1][c] ? 1 : 0;
        }
        if (c > 0) {
            n += cells[r][c - 1] ? 1 : 0;
        }
        if (c < s - 1) {
            n += cells[r][c + 1] ? 1 : 0;
        }
        return n;
    }
}

let automate = (core, automaton, message) => {
    let cells = automaton.cells, iteration = automaton.iteration, ruleset = automaton.ruleset;
    let s = cells.length;
    let newCells = new Array(s);
    for (let i = 0; i < s; i++) newCells[i] = new Array(s);
    core.automata[ruleset](cells, newCells, s, helpers);
    automaton.cells = newCells;
    automaton.iteration++;
    let editPromise = message.edit(drawWorld(automaton));
    if (iteration <= T) {
        editPromise.then(newMessage => {
            setTimeout(() => automate(core, automaton, newMessage), WAIT);
        }).catch(e => {});
    }
}
