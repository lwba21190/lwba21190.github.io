var dial = require("../node_modules/peer-dial");
var util = require("../node_modules/util");
var events = require("../node_modules/events");
var URL = require("../node_modules/url");
var builder  = require('../node_modules/xmlbuilder');

var HbbTVTerminal = function (dialDevice, appInfo) {

    var appLaunchURL = dialDevice && dialDevice.applicationUrl && (dialDevice.applicationUrl+"/HbbTV") || null;
    var app2AppURL = appInfo && appInfo.additionalData && appInfo.additionalData.X_HbbTV_App2AppURL || null;
    var interDevSyncURL = appInfo && appInfo.additionalData && appInfo.additionalData.X_HbbTV_InterDevSyncURL || null;
    var userAgent = appInfo && appInfo.additionalData && appInfo.additionalData.X_HbbTV_UserAgent || null;
    var friendlyName = dialDevice && dialDevice.friendlyName || null;
    dialDevice && (dialDevice.appLaunchURL = appLaunchURL);
    dialDevice && (dialDevice.app2AppURL = app2AppURL);
    dialDevice && (dialDevice.userAgent = userAgent);
    dialDevice && (dialDevice.interDevSyncURL = interDevSyncURL);

    this.getInfo = function () {
        return dialDevice || null;
    };
    this.getApp2AppURL = function () {
        return app2AppURL;
    };
    this.getInterDevSyncURL = function () {
        return interDevSyncURL;
    };
    this.getUserAgent = function () {
        return userAgent;
    };
    this.getAppLaunchURL = function () {
        return appLaunchURL;
    };
    this.getFriendlyName = function () {
        return friendlyName;
    };

    this.launchHbbTVApp = function (launchData,callback) {
        var orgId = launchData.orgId || "";
        var appId = launchData.appId || "";
        var appName = launchData.appName || "";
        var appNameLanguage = launchData.appNameLanguage || "";
        var appUrlBase = launchData.appUrlBase || "";
        var appLocation = launchData.appLocation || "";
		console.log(appUrlBase);
        var appUrl = URL.parse(appUrlBase);
		console.log(appUrl.protocol);
		console.log(appUrl.hostname);
        if(appUrl.protocol && appUrl.hostname){
            var mhp = {
                "mhp:ServiceDiscovery": {
                    "@xmlns:mhp": "urn:dvb:mhp:2009",
                    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "mhp:ApplicationDiscovery": {
                        "@DomainName": appUrl.hostname,
                        "mhp:ApplicationList": {
                            "mhp:Application": {
                                "mhp:appName": {
                                    "@Language": appNameLanguage,
                                    "#text": appName
                                },
                                "mhp:applicationIdentifier": {
                                    "mhp:orgId": orgId,
                                    "mhp:appId": appId
                                },
                                "mhp:applicationDescriptor": {
                                    "mhp:type": {
                                        "mhp:OtherApp": "application/vnd.hbbtv.xhtml+xml"
                                    },
                                    "mhp:controlCode": "AUTOSTART",
                                    "mhp:visibility": "VISIBLE_ALL",
                                    "mhp:serviceBound": "false",
                                    "mhp:priority": "1",
                                    "mhp:version": "01",
                                    "mhp:mhpVersion": {
                                        "mhp:profile": "0",
                                        "mhp:versionMajor": "1",
                                        "mhp:versionMinor": "3",
                                        "mhp:versionMicro": "1"
                                    }
                                },
                                "mhp:applicationTransport": {
                                    "@xsi:type": "mhp:HTTPTransportType",
                                    "mhp:URLBase": appUrlBase
                                },
                                "mhp:applicationLocation": appLocation
                            }
                        }
                    }
                }
            };
            var launchReq = builder.create(mhp).end({ pretty: true});
            dialDevice.launchApp("HbbTV",launchReq, "text/plain", function (launchRes, err) {
                if(typeof launchRes != "undefined"){
                    callback && callback(launchRes,err);
                }
                else if(err){
                    callback && callback(null,err);
                }
            });
        }
        else {
            var err = new Error("mhp:applicationTransport->URLBase is mandatory and must be an valid URL");
            callback && callback(null,err);
        }
    };
};


var HbbTVDialClient = function () {
    var dialClient = new dial.Client();
    var self = this;
    var terminals = {};
    dialClient.on("ready",function(){
        self.emit("ready");
    }).on("found",function(deviceDescriptionUrl, headers){
        dialClient.getDialDevice(deviceDescriptionUrl, function (dialDevice, err) {
            if(dialDevice){
                dialDevice.getAppInfo("HbbTV", function (appInfo, err) {
                    if(appInfo){
                        var terminal = new HbbTVTerminal(dialDevice, appInfo);
                        terminals[deviceDescriptionUrl] = terminal;
                        self.emit("found", terminal,deviceDescriptionUrl);
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
        var terminal = terminals[deviceDescriptionUrl];
        delete terminals[deviceDescriptionUrl];
        self.emit("disappear",deviceDescriptionUrl, terminal);
    }).on("stop", function(){
        self.emit("stop");
    }).on("error", function (err) {
        self.emit("error",err);
    });

    this.start = function () {
        dialClient.start();
        return this;
    };

    this.refresh = function () {
        dialClient.refresh();
        return this;
    };

    this.stop = function () {
        dialClient.stop();
        return this;
    };
};

util.inherits(HbbTVDialClient, events.EventEmitter);
module.exports = HbbTVDialClient;