var dial = require("../node_modules/peer-dial");
var util = require("../node_modules/util");
var events = require("../node_modules/events");
var CsLauncherDialClient = require("./csdialclient.js");
var HbbTVDialClient = require("./terminaldialclient.js");
var ws = require("../node_modules/ws");

var WebSocketServer = ws.Server;
var enableCORS = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Application-URL");
    next();
};

var HbbTVCSManager = function (httpServer, isCs) {
    //var prefix = expressApp.get("cs-manager-prefix") || "";
    isCs = (isCs == true);
    console.log(isCs);
    var csLauncherDialClient = new CsLauncherDialClient();
    var hbbTVDialClient = new HbbTVDialClient();
    var self = this;
    var wsServer = null;
    var csLaunchers = {};
    var tmpCsLaunchers = {};
    var terminals = {};
    var tmpTerminals = {};
    var lastCsLauncherRefresh = 0;
    var lastHbbTVTerminalRefresh = 0;
    var discoveryTime = 5000;
    var readyCounter = isCs?1:0;
    var stopCounter = isCs?1:0;
    csLauncherDialClient.on("ready",function(){
        readyCounter++ && self.emit("ready");
    }).on("found",function(csLauncher){
        csLaunchers[csLauncher.getAppLaunchURL()] = csLauncher;
        tmpCsLaunchers[csLauncher.getAppLaunchURL()] = csLauncher.getInfo();
    }).on("disappear", function(deviceDescriptionUrl, csLauncher){
        delete csLaunchers[deviceDescriptionUrl];
        delete tmpCsLaunchers[deviceDescriptionUrl];
    }).on("stop", function(){
        stopCounter++ && self.emit("stop");
    }).on("error", function (err) {
        self.emit("error",err);
    });

    hbbTVDialClient.on("ready",function(){
        readyCounter++ && self.emit("ready");
    }).on("found",function(terminal){
        terminals[terminal.getAppLaunchURL()] = terminal;
        tmpTerminals[terminal.getAppLaunchURL()] = terminal.getInfo();
    }).on("disappear", function(deviceDescriptionUrl, terminal){
        delete terminals[deviceDescriptionUrl];
        delete tmpTerminals[deviceDescriptionUrl];
    }).on("stop", function(){
        stopCounter++ && self.emit("stop");
    }).on("error", function (err) {
        self.emit("error",err);
    });

    var handleConnectionReceived = function(connection) {
        connection.on("message", function(msg, flags) {
            // expect msg as jsonrpc request
            if(typeof msg == "string"){
                try{
                    var req = JSON.parse(msg);
                    var method = req.method;
                    if(method == "discoverCSLaunchers"){
                        discoverCSLaunchers(connection,req);
                    }
                    else if(method == "discoverTerminals"){
                        discoverTerminals(connection,req);
                    }
                    else if(method == "launchCSApp"){
                        launchCSApp(connection,req);
                    }
                    else if(method == "launchHbbTVApp"){
                        launchHbbTVApp(connection,req);
                    }
                }
                catch(err){
                    self.emit("error",err);
                }
            }
        }).on("close", function(code, reason) {

        });
    };

    var verifyClient = function (info,callback) {
        var req = info.req;
        var url = req.url || "";
        if(url == "/hbbtvmanager"){
            callback && callback(true);
        }
        /*else {
         callback && callback(false,400);
         }*/
    };

    var discoverCSLaunchers = function (connection, req) {
        var currentTime = new Date().getTime();
        var timeElapsed = currentTime - lastCsLauncherRefresh;
        var timeout = 0;
        if(timeElapsed > discoveryTime){
            lastCsLauncherRefresh = currentTime;
            tmpCsLaunchers = {};
            csLauncherDialClient.refresh();
            timeout = discoveryTime;
        }
        else {
            timeout = discoveryTime-timeElapsed;
        }
        setTimeout(function(){
            var rsp = {
                "jsonrpc": "2.0",
                "result": tmpCsLaunchers,
                "id": req.id
            };
            connection.send(JSON.stringify(rsp));
        }, timeout);
    };

    var launchCSApp = function (connection, req) {
        var launcherId = req.params[0];
        var payload = req.params[1];
        var csLauncher = csLaunchers[launcherId];
        var code = null;
        // TODO check payload if it is conform with the HbbTV 2.0 Spec as described in 14.4.2
        if(csLauncher){
            csLauncher.launchCsApp(payload, function (launchRes, err) {
                if(err){
                    code = 400;
                }
                else {
                    code = 200;
                }
            });
        }
        else {
            code = 404;
        }
        var rsp = {
            "jsonrpc": "2.0",
            "result": code,
            "id": req.id
        };
        connection.send(JSON.stringify(rsp));
    };

    var discoverTerminals = function (connection, req) {
        var currentTime = new Date().getTime();
        var timeElapsed = currentTime - lastHbbTVTerminalRefresh;
        var timeout = 0;
        if(timeElapsed > discoveryTime){
            lastHbbTVTerminalRefresh = currentTime;
            tmpTerminals = {};
            hbbTVDialClient.refresh();
            timeout = discoveryTime;
        }
        else {
            timeout = discoveryTime-timeElapsed;
        }
        setTimeout(function(){
            var rsp = {
                "jsonrpc": "2.0",
                "result": tmpTerminals,
                "id": req.id
            };
            connection.send(JSON.stringify(rsp));
        }, timeout);
    };

    var launchHbbTVApp = function (connection, req) {
        var terminalId = req.params[0];
        var options = req.params[1];
        var terminal = terminals[terminalId];
        var code = null;
        // TODO check options object
        if(terminal){
            terminal.launchHbbTVApp(options, function (launchRes, err) {
                if(err){
                    code = 400;
                }
                else {
                    code = 200;
                }
            });
        }
        else {
            code = 404;
        }
        var rsp = {
            "jsonrpc": "2.0",
            "result": code,
            "id": req.id
        };
        connection.send(JSON.stringify(rsp));
    };

    var start = function () {
        !isCs && csLauncherDialClient.start();
        hbbTVDialClient.start();
        wsServer = new WebSocketServer({
            server: httpServer,
            verifyClient : verifyClient
        }).on("connection", handleConnectionReceived);
        return this;
    };

    var stop = function () {
        !isCs && csLauncherDialClient.stop();
        hbbTVDialClient.stop();
        wsServer.close();
        return this;
    };

    Object.defineProperty(this,"start", {
        get: function(){
            return start;
        }
    });

    Object.defineProperty(this,"stop", {
        get: function(){
            return stop;
        }
    });
};

util.inherits(HbbTVCSManager, events.EventEmitter);

module.exports = HbbTVCSManager;