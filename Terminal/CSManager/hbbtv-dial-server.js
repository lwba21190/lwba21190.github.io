var dial = require("../node_modules/peer-dial");
var util = require("../node_modules/util");
var events = require("../node_modules/events");
var opn = require("../node_modules/opn");
var xml2js = require("../node_modules/xml2js");

var HbbTVDialServer = function (expressApp) {
    var self = this;
    var MANUFACTURER = "TCL";
    var MODEL_NAME = "HbbTV 2.0 Node.js Companion Screen Feature Emulator";
    var port = expressApp.get("port") || 80;
    var prefix = expressApp.get("dial-prefix") || "";
    var csManagerPrefix = expressApp.get("cs.manager-prefix") || "";
    var apps = {
        "HbbTV": {
            disabled: false,
            name: "HbbTV",
            state: "running",
            allowStop: false,
            additionalData: {
                "hbbtv:X_HbbTV_App2AppURL":"",
                "hbbtv:X_HbbTV_InterDevSyncURL": "",
                "hbbtv:X_HbbTV_UserAgent": ""
            },
            namespaces: {
                "hbbtv": "urn:hbbtv:HbbTVCompanionScreen:2014"
            }
        },
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
        if(app.name == "HbbTV"){
            xml2js.parseString(launchData, {
                trim: true,
                explicitArray: false,
                mergeAttrs: true,
                explicitRoot: false,
                tagNameProcessors: [function(tagName){
                    tagName = tagName.substr(tagName.indexOf(":")+1);
                    return tagName;
                }],
                attrNameProcessors: [function(attrName){
                    attrName = attrName.substr(attrName.indexOf(":")+1);
                    return attrName;
                }]
            },function (err, launchData) {
                if(err){
                    callback && callback(null,err);
                }
                else {
                    try {
                        var appUrlBase = launchData.ApplicationDiscovery.ApplicationList.Application.applicationTransport.URLBase || "";
                        var appLocation = launchData.ApplicationDiscovery.ApplicationList.Application.applicationLocation || "";
                        var url = appUrlBase && (appUrlBase+appLocation) || null;
                        if(url){
                            var csManagerParameters = "port="+port+"&hostname="+self.hostname;
                            openUrl(url+"#"+csManagerParameters);
                            app.state = "running";
                            callback && callback(app.pid);
                        }
                        else {
                            callback && callback(null, new Error("URLBase element in the XML MHP of the DIAL Launch Request is missing or empty"));
                        }
                    }
                    catch (err){
                        callback && callback(null, err);
                    }
                }
            });
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
						app.additionalData["hbbtv:X_HbbTV_InterDevSyncURL"] = null;
						app.additionalData["hbbtv:X_HbbTV_UserAgent"] = null;
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
};

util.inherits(HbbTVDialServer, events.EventEmitter);

module.exports = HbbTVDialServer;