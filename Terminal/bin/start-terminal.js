var PORT = global.PORT
if(!PORT){
    console.log("variable 'global.PORT' is missing or not a valid port");
    process.exit(1);
}

var hbbtv = require("../index.js");
var HbbTVApp2AppServer = hbbtv.HbbTVApp2AppServer;
var HbbTVDialServer = hbbtv.HbbTVDialServer; 
var HbbTVCsManager = hbbtv.HbbTVCsManager;

var http = require("http");
var express = require("express");
var app = express();
var DIAL_PREFIX = "/dial";
var CS_MANAGER_PREFIX = "/csmanager";
http.globalAgent.maxSockets = 100;
var counter = 0;
app.set("port",PORT);
app.set("dial-prefix",DIAL_PREFIX);
app.set("cs-manager-prefix", CS_MANAGER_PREFIX);

var httpServer = http.createServer(app);

var hbbtvApp2AppServer = new HbbTVApp2AppServer(httpServer).on("ready", function () {
		console.log("HbbTV App2App Server is ready");
		counter++;
	}).on("stop", function () {
		console.log("HbbTV App2App Server is stopped");
		if(--counter == 0){
			process.exit();
		}
	}).on("error", function (err) {
		console.error("HbbTVApp2AppServer Error", err);
});

var hbbtvDialServer = new HbbTVDialServer(app).on("ready", function () {
    console.log("HbbTV DIAL Server is ready");
    counter++;
}).on("stop", function () {
    console.log("HbbTV DIAL Server is stopped");
    if(--counter == 0){
        process.exit();
    }
}).on("error", function (err) {
    console.error("HbbTVDialServer Error", err);
});
var hbbTVCsManager = new HbbTVCsManager(httpServer).on("ready", function () {
		console.log("HbbTV CS Manager is ready");
		counter++;
	}).on("stop", function () {
		console.log("HbbTV CS Manager is stopped");
		if(--counter == 0){
			process.exit();
		}
	}).on("error", function (err) {
		console.error("HbbTVCSManager Error", err);
});

httpServer.listen(PORT, function() {
    console.log("HbbTV Terminal is listening on port ", PORT);
    hbbtvApp2AppServer.start();
	hbbtvDialServer.start();
	hbbTVCsManager.start();
    
});

process.on('SIGINT', function() {
    console.log("Stopping HbbTV Terminal. Please wait ...");
    hbbtvApp2AppServer.stop();
	hbbtvDialServer.stop();
    hbbTVCsManager.stop();
    setTimeout(function () {
        process.exit();
    },3000);
});