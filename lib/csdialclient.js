var dial = require("../node_modules/peer-dial");
var util = require("../node_modules/util");
var events = require("../node_modules/events");

var CsLauncher = function (dialDevice, appInfo) {
    var appLaunchURL = dialDevice && dialDevice.applicationUrl && (dialDevice.applicationUrl+"/Famium") || null;
    var osId = appInfo && appInfo.additionalData && appInfo.additionalData.X_FAMIUM_CS_OS_ID || null;

    dialDevice && (dialDevice.appLaunchURL = appLaunchURL);
    dialDevice && (dialDevice.osId = osId);

    var getAppLaunchURL = function () {
        return appLaunchURL;
    };

    var getInfo = function () {
        return dialDevice || null;
    };

    var launchCsApp = function (launchData,callback) {
        var launchReq = launchData;
        dialDevice.launchApp("Famium",launchReq, "text/plain", function (launchRes, err) {
            if(typeof launchRes != "undefined"){
                callback && callback(launchRes,err);
            }
            else if(err){
                callback && callback(null,err);
            }
        });
    };

    Object.defineProperty(this,"launchCsApp", {
        get: function(){
            return launchCsApp;
        }
    });

    Object.defineProperty(this,"getInfo", {
        get: function(){
            return getInfo;
        }
    });

    Object.defineProperty(this,"getAppLaunchURL", {
        get: function(){
            return getAppLaunchURL;
        }
    });
};

var CsLauncherDialClient = function () {
    var dialClient = new dial.Client();
    var self = this;
    var csLaunchers = {};
    dialClient.on("ready",function(){
        self.emit("ready");
    }).on("found",function(deviceDescriptionUrl, headers){
        dialClient.getDialDevice(deviceDescriptionUrl, function (dialDevice, err) {
            if(dialDevice){
                dialDevice.getAppInfo("Famium", function (appInfo, err) {
                    if(appInfo){
                        var csLauncher = new CsLauncher(dialDevice, appInfo);
                        csLaunchers[deviceDescriptionUrl] = csLauncher;
                        self.emit("found", csLauncher);
                    }
                    else if(err){
                    }
                });
            }
            else if(err){
                var error = new Error("Error on get device description from "+deviceDescriptionUrl, err.message);
                self.emit("error", error);
            }
        });
    }).on("disappear", function(deviceDescriptionUrl, headers){
        var csLauncher = csLaunchers[deviceDescriptionUrl];
        delete csLaunchers[deviceDescriptionUrl];
        self.emit("disappear",deviceDescriptionUrl, csLauncher);
    }).on("stop", function(){
        self.emit("stop");
    }).on("error", function (err) {
        self.emit("error",err);
    });

    var start = function () {
        dialClient.start();
        return this;
    };

    var refresh = function () {
        dialClient.refresh();
        return this;
    };

    var stop = function () {
        dialClient.stop();
        return this;
    };

    Object.defineProperty(this,"start", {
        get: function(){
            return start;
        }
    });

    Object.defineProperty(this,"refresh", {
        get: function(){
            return refresh;
        }
    });

    Object.defineProperty(this,"stop", {
        get: function(){
            return stop;
        }
    });
};

util.inherits(CsLauncherDialClient, events.EventEmitter);
module.exports = CsLauncherDialClient;