const PERMISSIONS = ["ADMIN", "QUOTEKILL", "UNDO"];
var config;
module.exports.initialize = (conf) => {
    config = conf;
}

module.exports.args = (text) => {
    return text.split(" ").filter(arg=>arg.length > 0);
}

module.exports.getPermission = (db, discordId, permissionName, channel, ok, notOk) => {
    if (notOk == undefined) {
        notOk = () => {
            channel.send(config["permission_denied_error"]);
        }
    }
    let permissionValue = 1 | 1 << PERMISSIONS.indexOf(permissionName);
    db.userPermissions(discordId, permissions => {
        if (permissions & permissionValue != 0) ok();
        else notOk();
    });
}