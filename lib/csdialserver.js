/**
 * Created by liwenb on 2016/3/26.
 */
var HbbTVDialServer = require("./terminaldialserver.js");
var util = require("../node_modules/util");

var CsLauncherDialServer = function (expressApp) {
    var isCsLauncher = true;
    HbbTVDialServer.call(this,expressApp,isCsLauncher);
};

util.inherits(CsLauncherDialServer, HbbTVDialServer);
module.exports = CsLauncherDialServer;