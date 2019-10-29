const fs = require("fs");
const PERMISSIONS = ["ADMIN", "QUOTEKILL", "UNDO"];

function logError() {
    var d = new Date();
    console.error(d.toLocaleString());
    for (let i = 0; i < arguments.length; i++) {
        console.error(arguments[i]);
    }
}
module.exports = {logError};

module.exports.args = (text) => {
    return text.split(" ").filter(arg=>arg.length > 0);
}

let isObj = item => item && typeof item === 'object' && !Array.isArray(item);

module.exports.deepMerge = (base, mod) => {
    if (isObj(base) && isObj(mod)) {
        for (let key in mod) {
            if (isObj(mod[key])) {
                if (!base[key]) base[key] = {};
                module.exports.deepMerge(base[key], mod[key]);
            } else {
                base[key] = mod[key];
            }
        }
    }
}

module.exports.fatalError = () => {
    fs.unlink("./pid");
    process.exit(1);
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

module.exports.splitLongMessage = (lines) => {
    let start = 0, output = [];
    while (start < lines.length) {
        let end = start, count = 0, message = "";
        while (count < 2000 && end < lines.length) {
            count += lines[end++].length;
        }
        for (let i = start; i < end - 1; i++) {
            message += lines[i];
        }
        if (end < lines.length) end--;
        output.push(message);
        start = end;
    }
    return output;
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

module.exports.timeToSecs = (input) => { //converts a time in *d*h*m* format to seconds, returns -1 if format is invalid
    let total = 0;
    let digitsOnly = /^[0-9]*$/;
    if (input.length == 0) {
        return null;
    }
    if (input.indexOf('w') != -1) {
        let weeks = input.slice(0, input.indexOf('w'));
        if (!digitsOnly.test(weeks)) {
            return null;
        }
        total += 7 * 86400 * parseInt(weeks);
        input = input.slice(input.indexOf('w') + 1);
    }
    if (input.indexOf('d') != -1) {
        let days = input.slice(0, input.indexOf('d'));
        if (!digitsOnly.test(days)) {
            return null;
        }
        total += 86400 * parseInt(days);
        input = input.slice(input.indexOf('d') + 1);
    }
    if (input.indexOf('h') != -1) {
        let hours = input.slice(0, input.indexOf('h'));
        if (!digitsOnly.test(hours)) {
            return null;
        }
        total += 3600 * parseInt(hours);
        input = input.slice(input.indexOf('h') + 1);
    }
    if (input.indexOf('m') != -1) {
        let mins = input.slice(0, input.indexOf('m'));
        if (!digitsOnly.test(mins)) {
            return null;
        }
        total += 60 * parseInt(mins);
        input = input.slice(input.indexOf('m') + 1);
    }
    if (!digitsOnly.test(input)) {
        return null;
    }
    if (input.length > 0) {
        total += parseInt(input);
    }
    return total;
}
