module.exports = (cells, newCells, s, helpers) => {
    for (let r = 0; r < s; r++) {
        for (let c = 0; c < s; c++) {
            let n = helpers.neighbors(cells, r, c).filter(e=>e).length;
            if (cells[r][c]) {
                newCells[r][c] = n >= 2 && n <= 3;
            } else {
                newCells[r][c] = n == 3;
            }
        }
    }
}