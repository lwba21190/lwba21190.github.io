/**
 * Created by liwenb on 2016/3/26.
 */
var HbbTVCsManager = require("./csmanager.js");
var util = require("../node_modules/util");

var HbbTVTerminalManager = function(httpServer){
    var isCs = true;
    HbbTVCsManager.call(this,httpServer,isCs);
};

util.inherits(HbbTVTerminalManager, HbbTVCsManager);
module.exports = HbbTVTerminalManager;