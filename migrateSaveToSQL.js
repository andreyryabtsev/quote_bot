const fs = require('fs');
const mysql = require('mysql');
var savedData, connection, usersToIDs, logCount, logExpected;
fs.readFile("./save.json", 'utf8', (err, data) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    savedData = JSON.parse(data);
    createMigrate();
});

function createMigrate() {
    let commands = [];
    let query;
    let w = s=>commands.push(s);

    let users = savedData.users;
    for (let u in users) {
        if (u == undefined) continue;
        query = mysql.format('INSERT INTO users SET discord_id = ?, permissions = ?, nickname = ?, signature = ?;',
            [u, users[u].p, users[u].n, users[u].e]);
        w(query);
        for (let t of users[u].t) {
            if (t == undefined) continue;
            let timestamp = t.d.d != undefined ? t.d.d : t.d;
            query = mysql.format('INSERT INTO logs (content, created_at, user_id) SELECT ?, ?, id FROM users WHERE discord_id = ?;',
                [t.c, timestamp, u]);
            w(query);
        }
    }
    for (let q of savedData.quotes) {
        if (q == undefined) continue;
        query = mysql.format('INSERT INTO quotes (content, user_id) SELECT ?, id FROM users WHERE discord_id = ?;',
            [q.t, q.u]);
        w(query);
    }
    for (let v of savedData.votes) {
        if (v == undefined) continue;
        query = mysql.format('INSERT INTO votes (content, discord_message_id, options, created_at, user_id) SELECT ?, ?, ?, ?, id FROM users WHERE discord_id = ?;',
            [v.name, v.messageId, JSON.stringify(v.options), v.createdAt, v.author]);
        w(query);
    }
    let i = 0;
    for (let type in savedData.cfg.terminal) {
        if (type == undefined) continue;
        for (let token of savedData.cfg.terminal[type]) {
            if (token == undefined) continue;
            query = mysql.format('INSERT INTO cfg_terminal_tokens SET type = ?, content = ?;',
                [i, token]);
            w(query);
        }
        i++;
    }
    
    let sqlscript = commands.join("\n");
    fs.writeFile("./save.sql", sqlscript, 'utf8');
}

