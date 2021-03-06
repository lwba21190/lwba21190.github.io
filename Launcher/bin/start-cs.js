/**
 * Created by liwenb on 2016/3/26.
 */
var PORT = global.PORT;
if(!PORT){
    console.log("variable 'global.PORT' is missing or not a valid port");
    process.exit(1);
}
var launcher = require("../index.js");
var CsLauncherDialServer = launcher.CsLauncherDialServer;
var http = require("http");
var express = require("express");
var app = express();
var DIAL_PREFIX = "/dial";
app.set("port",PORT);
app.set("dial-prefix",DIAL_PREFIX);
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



httpServer.listen(PORT, function() {
    console.log("HbbTV Companion Screen is listening on port ", PORT);
    csLauncherDialServer.start();
});

process.on('SIGINT', function() {
    console.log("Stopping HbbTV Companion Screen. Please wait ...");
    csLauncherDialServer.stop();
    setTimeout(function () {
        process.exit();
    },3000);
});