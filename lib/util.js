const fs = require("fs");
const PERMISSIONS = ["ADMIN", "QUOTEKILL", "UNDO"];

module.exports.args = (text) => {
    return text.split(" ").filter(arg=>arg.length > 0);
}

module.exports.fatalError = () => {
    fs.unlink("./pid");
    process.exit(1);
}

module.exports.logError = (text) => {
    var d = new Date();
    console.error(d.toLocaleString());
    for (let arg of arguments) {
        console.error(arg);
    }  
}

module.exports.formatDuration = (ms) => {
    let result = "",
        sec = (ms / 1000 >> 0) % 60,
        min = (ms / 60 / 1000 >> 0) % 60, 
        hr = (ms / 60 / 60 / 1000 >> 0) % 24,
        days = (ms / 24 / 60 / 60 / 1000 >> 0);
    if (days > 0) result += days + (days != 1 ? " days " : " day ");
    if (hr > 0) result += hr + (hr != 1 ? " hours " : " hour ");
    if (min > 0) result += min + (min != 1 ? " minutes " : " minute ");
    result += sec + (sec != 1 ? " seconds" : " second");
    return result;
}

module.exports.permissionValue = (name) => {
    return 1 | 1 << PERMISSIONS.indexOf(name);
}

module.exports.getPermission = (db, discordId, permissionName, channel, denied, ok, notOk) => {
    if (notOk == undefined) {
        notOk = () => {
            channel.send(denied);
        }
    }
    let permissionValue = module.exports.permissionValue(permissionName);
    db.userPermissions(discordId, permissions => {
        if (permissions & permissionValue != 0) ok();
        else notOk();
    });
}

module.exports.simpleRandom = (array) => {
    return array[Math.floor(Math.random() * (array.length))];
}

module.exports.toWords = (text) => {
    return text.toLowerCase()
               .replace(/[\!\?\,\;\(\)\*\[\]\.\"]+/gi, " ")
               .split(" ")
               .filter(a => a != "");
}

module.exports.weightedRandom = (array) => {
    let rand = Math.random(), sum = 0.0;
    for (let element of array) {
        sum += element.weight;
        if (sum > rand) return element.value;
    }
}
