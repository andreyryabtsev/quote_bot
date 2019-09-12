const fs = require("fs");

// Passes each filename in a directory to a function; optionally calls a callback
module.exports.forEachFile = (directory, func, callback) => {
    fs.readdir(__dirname + "/../" + directory, function(error, items) {
        if (error != null) {
            util.logError(error);
            util.fatalError();
        }
        items.forEach(func);
        if (callback) callback();
    });
}

module.exports.knownUserIDs = (client) => {
    let userIDs = [];
    client.guilds.forEach(guild => {
        if (guild.available) {
            guild.members.forEach(member => {
                userIDs.push(member.user.id);
            });
        }
    });
    return userIDs;
}

module.exports.loadAuthAndConfig = (util) => {
    let auth, config;
    try {
        auth = JSON.parse(fs.readFileSync("./auth.json", "utf8"));
        config = JSON.parse(fs.readFileSync("./default_config.json", "utf8"));
    } catch (e) {
        util.logError("Unable to load auth and default config; please ensure defaults have not been edited and you copied defaults/auth.json", e);
        util.fatalError();
    }
    let custom;
    try {
        custom = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    } catch (e) {
        util.logError("Custom config missing or malformatted, proceeding with default.");
        custom = {};
    }
    util.deepMerge(config, custom);
    config.authToken = auth.token;
    return config;
}

module.exports.loadFilter = (util) => {
    let filter;
    try {
        filter = fs.readFileSync("./filter.txt", "utf8");
    } catch (e) {
        util.logError("No filter list found, filtering disabled.");
        filter = "";
    }
    return filter.split("\n").filter(raw => /\S/.test(raw)).map(raw => new RegExp(raw, "i"));
}

// Once config has been loaded, parse the help_items object for references to other config properties
module.exports.prepareConfigHelp = (config) => {
    let parseValue = value => {
        value = value.substring(1, value.length - 1);
        let args = value.split(".");
        let obj = config;
        for (let i = 0; i < args.length; i++) {
            if (!(args[i] in obj)) return "CONFIG_ERROR";
            obj = obj[args[i]];
        }
        return obj;
    };
    let parseText = text => {
        return text.replace(/{[^}]*}/g, parseValue);
    }
    for (let oldName in config["help_items"]) {
        let newName = parseText(oldName);
        let newValue = parseText(config["help_items"][oldName]);
        delete config["help_items"][oldName];
        config["help_items"][newName] = newValue;
    }
    for (let plainResponse in config["plain_responses"]) {
        let helpKey = "`!" + plainResponse + "`";
        if (!(helpKey in config["help_items"])) {
            config["help_items"][helpKey] = "respond with " + config["plain_responses"][plainResponse];
        }
    }
}
