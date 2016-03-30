/**
 * Created by liwenb on 2016/3/26.
 */
var PORT = global.PORT;
if(!PORT){
    console.log("variable 'global.PORT' is missing or not a valid port");
    process.exit(1);
}
var hbbtv = require("../index.js");
var HbbTVTerminalManager = hbbtv.HbbTVTerminalManager;
var CsLauncherDialServer = hbbtv.CsLauncherDialServer;
var http = require('http');
var express = require("express");
var app = express();
var DIAL_PREFIX = "/dial";
app.set("port",PORT);
app.set("dial-prefix",DIAL_PREFIX);
http.globalAgent.maxSockets = 100;
var counter = 0;
var httpServer = http.createServer(app);

var csLauncherDialServer = new CsLauncherDialServer(app).on("ready", function () {
    console.log("HbbTV CS Launcher is ready");
    counter++;
}).on("stop", function () {
    console.log("HbbTV CS Launcher is stopped");
    if(--counter == 0){
        process.exit();
    }
}).on("error", function (err) {
    console.error(err);
});

var hbbTVTerminalManager = new HbbTVTerminalManager(httpServer).on("ready", function () {
    counter++;
    console.log("HbbTV Terminal Manager is ready");
}).on("stop", function () {
    console.log("HbbTV Terminal Manager is stopped");
    if(--counter == 0){
        process.exit();
    }
}).on("error", function (err) {
    console.error(err);
});

httpServer.listen(PORT, function() {
    console.log("HbbTV Companion Screen is listening on port ", PORT);
    //console.log("***** Please append the hash query '#port="+PORT+"'"," to the URL of your CS Web App.\n***** The JavaScript Lib 'hbbtv-manager-polyfill.js' must be included in the CS Web App");
    hbbTVTerminalManager.start();
    csLauncherDialServer.start();
});

process.on('SIGINT', function() {
    console.log("Stopping HbbTV Companion Screen. Please wait ...");
    hbbTVTerminalManager.stop();
    csLauncherDialServer.stop();
    setTimeout(function () {
        process.exit();
    },3000);
});