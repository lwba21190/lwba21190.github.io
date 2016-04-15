var dial = require("peer-dial");
var util = require("util");
var events = require("events"); 
var opn = require("opn");

var CsLauncherDialServer = function(expressApp){
	var self = this;
	var MANUFACTURER = "TCL";
    var MODEL_NAME = "HbbTV 2.0 Node.js Companion Screen Feature Emulator";
    var port = expressApp.get("port") || 80;
    var prefix = expressApp.get("dial-prefix") || "";
    var csManagerPrefix = expressApp.get("cs.manager-prefix") || "";
	var friendlyName = "TCLLauncher";
		
	var apps = {
        "TCL": {
            disabled: false,
            name: "TCL",
            state: "running",
            allowStop: false,
            additionalData: {
                "tcl:X_TCL_CS_OS_ID":"info.tcl.com/0.0.1"
            },
            namespaces: {
                "tcl": "http://info.tcl.com"
            }
        }
    };
	
	var openUrl = function (url) {
        try{
            opn(url);
        }
        catch(err){
            console.error("Error on open URL", err.message);
        }
    };
	
	var launchApp = function (app, launchData, callback) {
        var self = this;
        if(app.name == "TCL"){
            try{
                launchData = JSON.parse(launchData);
                var url = null;
                for(var i=0; i<launchData.launch.length; i++){
                    var launch = launchData.launch[i];
                    if(launch.appType == "html"){
                        url = launch.launchUrl;
                        break;
                    }
					else if(launch.appType == "native"){
						
					}
                }
                if(url){
                    url += "#port="+port;
                    openUrl(url);
                    callback && callback(app.pid);
                }
                else {
                    callback && callback(null, new Error("CSLauncher Error: The launch request must contain at least one item from type 'html' and with a valid URL"));
                }
            }
            catch(err){
                callback && callback(null, err);
            }
        }
    };

	
	var stopApp = function (app, pid) {
        if(app && app.pid == pid && app.allowStop == true && !app.disabled){
            app.state = "stopped";
            return true;
        }
        return false;
    };
	
	var dialServer = new dial.Server({
		expressApp: expressApp,
        prefix: prefix,
        port: port,
        manufacturer: MANUFACTURER,
        modelName: MODEL_NAME,
        delegate: {
            getApp: function(appName){
                var app = apps[appName];
                if(app && !app.disabled){
                    if(appName == "HbbTV"){
                        var hostname = this.hostname;
                        app.additionalData["hbbtv:X_HbbTV_App2AppURL"] = "ws://"+hostname+":"+port+"/remote/";
                    }
                    return app;
                }
                return null;
            },
            launchApp: function(appName,launchData,callback){
                var app = apps[appName];
                if (app && !app.disabled) {
                    launchApp.call(this,app,launchData, callback);
                }
                else {
                    callback && callback(null, new Error("App ",appName," not found"));
                }
            },
            stopApp: function(appName,pid,callback){
                var app = apps[appName];
                var stopped = stopApp.call(this,app, pid);
                callback && callback(stopped);
            }
        }
    }).on("ready", function () {
        self.emit("ready");
    }).on("stop", function () {
        self.emit("stop");
    });

    this.start = function () {
        dialServer.start();
        return this;
    };

    this.stop = function () {
        dialServer.stop();
        return this;
    };
	
}

util.inherits(CsLauncherDialServer,events.EventEmitter);
module.exports = CsLauncherDialServer;
