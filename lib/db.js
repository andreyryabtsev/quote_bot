const mysql = require('mysql');
const connection = mysql.createConnection({host: "localhost", user: "bot", database: "bot"});

function handleError(error) {
    if (error) {
        console.error(error);
        process.exit(1);
    }
}

module.exports.initialize = (callback) => {
    connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;", (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.addQuote = (discordID, content, callback) => {
    connection.query("INSERT INTO quotes (content, user_id) SELECT ?, id FROM users WHERE discord_id = ?;", [content, discordID], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.deleteQuotes = (query, callback) => {
    connection.query("DELETE FROM quotes WHERE content LIKE ?;", ["%" + query + "%"], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.allLogs = (discordIDs, startAt, callback) => {
    connection.query(
        "SELECT users.nickname, logs.created_at FROM logs INNER JOIN users ON logs.user_id = users.id WHERE users.discord_id IN (?) AND logs.created_at > ?;",
        [discordIDs, startAt], (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.forgetVocab = (typeID, word, callback) => {
    connection.query("DELETE FROM cfg_terminal_tokens WHERE type = ? AND content = ?;", [typeID, word], (error, results, fields) => {
        handleError(error);
        callback(results.affectedRows);
    });
}

module.exports.userPermissions = (discord_id, callback) => {
    connection.query("SELECT permissions FROM users WHERE users.discord_id = ?;", [discord_id], (error, results, fields) => {
        handleError(error);
        callback(results[0].permissions);
    });
}
