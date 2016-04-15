var dial = require("../node_modules/peer-dial");
var util = require("../node_modules/util");
var events = require("../node_modules/events");


var CsLauncher = function(dialDevice,appInfo){
	var appLaunchURL = dialDevice && dialDevice.applicationUrl && (dialDevice.applicationUrl+"/TCL") || null;
    var osId = appInfo && appInfo.additionalData && appInfo.additionalData.X_TCL_CS_OS_ID || null;

    dialDevice && (dialDevice.appLaunchURL = appLaunchURL);
    dialDevice && (dialDevice.osId = osId);

    this.getAppLaunchURL = function () {
        return appLaunchURL;
    };

    this.getInfo = function () {
        return dialDevice || null;
    };

    this.launchCsApp = function (launchData,callback) {
        var launchReq = launchData;
        dialDevice.launchApp("TCL",launchReq, "text/plain", function (launchRes, err) {
            if(typeof launchRes != "undefined"){
                callback && callback(launchRes,err);
            }
            else if(err){
                callback && callback(null,err);
            }
        });
    };
};

var CsLauncherDialClient = function(){
	var dialClient = new dial.Client();
	var self = this;
    var csLaunchers = {};
	dialClient.on("ready",function(){
		self.emit("ready");
	}).on("found",function(deviceDescriptionUrl, headers){
		dialClient.getDialDevice(deviceDescriptionUrl, function (dialDevice, err) {
			if(dialDevice){
				dialDevice.getAppInfo("TCL", function (appInfo, err) {
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
	}).on("disappear",function(deviceDescriptionUrl, headers){
        delete csLaunchers[deviceDescriptionUrl];
        self.emit("disappear",deviceDescriptionUrl);
    }).on("stop", function(){
        self.emit("stop");
    }).on("error", function (err) {
        self.emit("error",err);
    });
	
	this.state = "stop"
	
	this.start = function(){
		dialClient.start();
		this.state = "open";
        return this;
	};
	
	this.refresh = function(){
		dialClient.refresh();
        return this;
	};
	
	this.stop = function(){
		dialClient.stop();
		this.state = "stop";
        return this;
	};
}

util.inherits(CsLauncherDialClient,events.EventEmitter)

module.exports = CsLauncherDialClient;