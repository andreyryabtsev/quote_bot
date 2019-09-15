const T = 300, p = 0.7;

module.exports = (core, message, text) => {
    let s = parseInt(core.util.args(text)[0]);
    if (isNaN(s) || s < 2 || s > 30) {
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
    message.channel.send(drawWorld(cells, 1)).then(message => {
        automate(1, message, cells);
    });
}

let drawWorld = (cells, iteration) => {
    let content = "```";
    for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells.length; c++) {
            content += cells[r][c] ? "▦" : "▢";
        }
        if (r == 0 && iteration) content += iteration + "/" + T + "\n";
        content += "\n";
    }
    content += "```";
    return content;
}

let neighbors = (cells, r, c) => {
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

let automate = (iteration, message, cells) => {
    let s = cells.length;
    let newCells = new Array(s);
    for (let i = 0; i < s; i++) newCells[i] = new Array(s);
    automata["gameOfLife"](cells, newCells, s);
    let editPromise = message.edit(drawWorld(cells, iteration));
    if (iteration <= T) {
        editPromise.then(newMessage => {
            setTimeout(() => automate(iteration + 1, newMessage, cells), 4000);
        });
    }
}

const automata = {
    "gameOfLife": (cells, newCells, s) => {
        for (let r = 0; r < s; r++) {
            for (let c = 0; c < s; c++) {
                let n = neighbors(cells, r, c);
                if (cells[r][c]) {
                    newCells[r][c] = n >= 2 && n <= 3;
                } else {
                    newCells[r][c] = n == 3;
                }
            }
        }
    }
};
