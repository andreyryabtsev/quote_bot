const mysql = require('mysql');
const util = require('./util.js');
var connection;
function handleError(error) {
    if (error) {
        util.logError(error);
        util.fatalError();
    }
}

module.exports.initialize = (callback) => {
    connection = mysql.createConnection({host: "localhost", user: "bot", database: "bot"});
    connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;", (error, results, fields) => {
        handleError(error);
        callback();
    });
    connection.on('error', function(err) {
        util.logError(err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            module.exports.initialize(() => {
                util.logError("Recovered from DB error.");
            });
        } else {
            throw err;
        }
    });
}

//------- DATABASE WRAPPERS ---------

module.exports.addLog = (discordID, timestamp, caption, callback) => {
    connection.query("INSERT INTO logs (content, created_at, user_id) SELECT ?, ?, id FROM users WHERE discord_id = ?;",
        [caption, timestamp, discordID], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.addQuote = (discordID, time, content, callback) => {
    connection.query("INSERT INTO quotes (content, called_at, user_id) SELECT ?, ?, id FROM users WHERE discord_id = ?;", [content, time, discordID], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.addReminder = (discordID, channelID, time, content, seconds, repeatSeconds, callback) => {
    connection.query("INSERT INTO reminders (invoked_on, channel_id, content, delay_seconds, repeat_seconds, user_id) SELECT ?, ?, ?, ?, ?, id FROM users WHERE discord_id = ?;", [time, channelID, content, seconds, repeatSeconds, discordID], (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.addUsersIfNew = (discordIDs, callback) => {
    let sql = "INSERT IGNORE INTO users (discord_id) VALUES (" + connection.escape(discordIDs[0]) + ")";
    for (let i = 1; i < discordIDs.length; i++) {
        sql += ", (" + connection.escape(discordIDs[i]) + ")";
    }
    connection.query(sql + ";", (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.addVocab = (typeID, content, callback) => {
    connection.query("INSERT INTO cfg_terminal_tokens (type, content) VALUES (?, ?);", [typeID, content], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.addVote = (content, channelID, messageID, candidates, timestamp, discordID, callback) => {
    connection.query("INSERT INTO votes (content, discord_channel_id, discord_message_id, options, created_at, user_id) SELECT ?, ?, ?, ?, ?, id FROM users WHERE discord_id = ?;",
        [content, channelID, messageID, JSON.stringify(candidates), timestamp, discordID], (error, results, fields) => {
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

module.exports.allQuotes = (callback) => {
    connection.query(
        "SELECT quotes.content, quotes.called_at, users.nickname FROM quotes INNER JOIN users ON quotes.user_id = users.id;", (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.allReminders = (callback) => {
    connection.query(
        "SELECT reminders.id, reminders.channel_id, reminders.invoked_on, reminders.content, reminders.delay_seconds, reminders.repeat_seconds, users.discord_id FROM reminders INNER JOIN users ON reminders.user_id = users.id;", (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.authoredQuotes = (discordID, callback) => {
    connection.query(
        "SELECT quotes.content, users.nickname FROM quotes INNER JOIN users ON quotes.user_id = users.id WHERE users.discord_id = ?;",
        [discordID], (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.bumpReminders = (ids, bumpSeconds, now, callback) => {
    let valueString = "";
    for (let i=0; i < ids.length; i++) {
        let id = ids[i], seconds = bumpSeconds[i];
        valueString += ",(" + id + "," + now + "," + seconds + ", 0, 0, 0, '')";
    }
    valueString = valueString.substring(1);
    connection.query("INSERT INTO reminders (id, invoked_on, delay_seconds, repeat_seconds, channel_id, user_id, content) VALUES " + valueString + " ON DUPLICATE KEY UPDATE invoked_on=VALUES(invoked_on),delay_seconds=VALUES(delay_seconds);", [], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.checkVocab = (typeID, content, callback) => {
    connection.query("SELECT COUNT(*) AS count FROM cfg_terminal_tokens WHERE content = ? AND type = ?;", [content, typeID], (error, results, fields) => {
        handleError(error);
        callback(results[0].count > 0);
    });
}

module.exports.countVocab = (typeID, callback) => {
    if (typeID == -1) {
        connection.query("SELECT COUNT(*) AS count FROM cfg_terminal_tokens;", (error, results, fields) => {
            handleError(error);
            callback(results[0].count);
        });
    } else {
        connection.query("SELECT COUNT(*) AS count FROM cfg_terminal_tokens WHERE type = ?;", [typeID], (error, results, fields) => {
            handleError(error);
            callback(results[0].count);
        });
    }
}

module.exports.deleteLastLog = (discordID, callback) => {
    let subquery = "SELECT logs.id FROM logs INNER JOIN users ON users.id = logs.user_id WHERE users.discord_id = ? ORDER BY logs.created_at DESC LIMIT 1";
    connection.query("DELETE FROM logs WHERE id IN (SELECT id FROM (" + subquery + ") a);", discordID, (error, results, fields) => {
        handleError(error);
        callback(results.affectedRows);
    });
}

module.exports.deleteQuotes = (query, callback) => {
    connection.query("DELETE FROM quotes WHERE content LIKE ?;", ["%" + query + "%"], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.deleteReminders = (ids, callback) => {
    connection.query("DELETE FROM reminders WHERE id IN (?);", [ids], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.filteredQuotes = (query, callback) => {
    connection.query(
        "SELECT quotes.content, users.nickname FROM quotes INNER JOIN users ON quotes.user_id = users.id WHERE quotes.content LIKE ?;",
        ["%" + query + "%"], (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.filteredUserQuotes = (discordIDs, callback) => {
    connection.query(
        "SELECT quotes.content, users.nickname FROM quotes INNER JOIN users ON quotes.user_id = users.id WHERE users.discord_id IN (?);",
        [discordIDs], (error, results, fields) => {
        handleError(error);
        callback(results);
    });
}

module.exports.fetchVocab = (typeID, callback) => {
    if (typeID == -1) {
        connection.query("SELECT content FROM cfg_terminal_tokens;", (error, results, fields) => {
            handleError(error);
            callback(results.map(res => res.content));
        });
    } else {
        connection.query("SELECT content FROM cfg_terminal_tokens WHERE type = ?;", [typeID], (error, results, fields) => {
            handleError(error);
            callback(results.map(res => res.content));
        });
    }
}

module.exports.forgetVocab = (typeID, word, callback) => {
    connection.query("DELETE FROM cfg_terminal_tokens WHERE type = ? AND content = ?;", [typeID, word], (error, results, fields) => {
        handleError(error);
        callback(results.affectedRows);
    });
}

module.exports.lastLog = (discordID, callback) => {
    connection.query("SELECT MAX(logs.created_at) AS lastLog, users.signature FROM logs INNER JOIN users ON users.id = logs.user_id WHERE users.discord_id = ? GROUP BY users.signature;",
        [discordID], (error, results, fields) => {
        handleError(error);
        callback(results[0]);
    });
}

module.exports.lastVote = (keywords, callback) => {
    let sql = "SELECT content, discord_channel_id, discord_message_id, options FROM votes" +
        (keywords ? " WHERE content LIKE " + connection.escape("%" + keywords + "%") : "") + " ORDER BY created_at DESC LIMIT 1;";
    connection.query(sql, (error, results, fields) => {
        handleError(error);
        if (results.length > 0) {
            results[0].options = JSON.parse(results[0].options);
            callback(results[0]);
        } else {
            callback(null);
        }
    });
}

module.exports.quoteName = (discordID, callback) => {
    connection.query("SELECT nickname FROM users WHERE users.discord_id = ?;", [discordID], (error, results, fields) => {
        handleError(error);
        callback(results[0].nickname);
    });
}

module.exports.updateQuote = (content, time) => {
    connection.query("UPDATE quotes SET called_at = ? WHERE content = ?;", [time, content], (error, results, fields) => {
        handleError(error);
    });
}

module.exports.userPermissions = (discordID, callback) => {
    connection.query("SELECT permissions FROM users WHERE users.discord_id = ?;", [discordID], (error, results, fields) => {
        handleError(error);
        callback(results[0].permissions);
    });
}

module.exports.updateNickname = (discordID, nickname, callback) => {
    connection.query("UPDATE users SET nickname = ? WHERE users.discord_id = ?;", [nickname, discordID], (error, results, fields) => {
        handleError(error);
        callback();
    });
}

module.exports.updateSignature = (discordID, signature, callback) => {
    connection.query("UPDATE users SET signature = ? WHERE users.discord_id = ?;", [signature, discordID], (error, results, fields) => {
        handleError(error);
        callback();
    });
}
