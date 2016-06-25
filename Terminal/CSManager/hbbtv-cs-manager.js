var util = require("../node_modules/util");
var ws = require("../node_modules/ws");
var events = require("../node_modules/events");
var CsLauncherDialClient = require("./cslauncher-dial-client.js");
var HbbTVDialClient = require("./terminal-dial-client.js");

var HbbTVCSManager = function(httpServer,isSlave){
	var isSlave = (isSlave == true);
	var wsServer = null;
	var csLaunchers = {};
	var terminals = {};
	var csLaunchersInfo = {};
	var terminalsInfo = {};
	var self = this
	
	if(isSlave)
	{
		var hbbTVDialClient = new HbbTVDialClient();
		hbbTVDialClient.on("ready",function(){
			self.emit("ready");
		}).on("found",function(terminal,deviceDescriptionUrl){
			terminals[deviceDescriptionUrl] = terminal;
			terminalsInfo[deviceDescriptionUrl] = terminal.getInfo();
		}).on("disappear", function(deviceDescriptionUrl, terminal){
			delete terminals[deviceDescriptionUrl];
			delete terminalsInfo[deviceDescriptionUrl];
		}).on("stop", function(){
			self.emit("stop");
		}).on("error", function (err) {
			self.emit("error",err);
		});
	}
	else{
		var csLauncherDialClient = new CsLauncherDialClient();
		csLauncherDialClient.on("ready",function(){
			console.log("cs Launcher client ready");
		}).on("found",function(csLauncher,deviceDescriptionUrl){
			csLaunchers[deviceDescriptionUrl] = csLauncher;
			csLaunchersInfo[deviceDescriptionUrl] = csLauncher.getInfo();
		}).on("disappear",function(deviceDescriptionUrl){
			delete csLaunchers[deviceDescriptionUrl];
			delete csLaunchersInfo[deviceDescriptionUrl];
		}).on("stop",function(){
			self.emit("stop");
		}).on("error",function(err){
			self.emit("error",err);
		});
	}
	
	var handleReceivedConnectionFromApp = function(connection) {
        connection.on("message", function(msg, flags) {
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
                }
                catch(err){
                    self.emit("error",err);
                }
            }
        }).on("close", function(code, reason) {
			console.log("app to csmanager websocket connect closed " + code);
        });
    };
	
	function discoverCSLaunchers(connection,req){
		csLaunchersInfo = {};
		csLauncherDialClient.refresh();
		setTimeout(function(){
			var rsp = {
				"jsonrpc": "2.0",
				"result": csLaunchersInfo,
				"id": req.id
			};
			connection.send(JSON.stringify(rsp));
		},3000);

	}
	
	function discoverTerminals(connection,req){
		terminalsInfo = {};
		hbbTVDialClient.refresh();
		setTimeout(function(){
			var rsp = {
				"jsonrpc": "2.0",
				"result": terminalsInfo,
				"id": req.id
			};
			connection.send(JSON.stringify(rsp));
		},timeout);		
	}
	
	function launchCSApp(connection,req){
		var launcherId = req.params[0];
        var payload = req.params[1];
        var csLauncher = csLaunchers[launcherId];
        var code = null;
        if(csLauncher){
            csLauncher.launchCsApp(payload, function (launchRes, err) {
                if(err){
                    code = 400;
                }
                else {
                    code = 200;
                }
				 var rsp = {
                    "jsonrpc": "2.0",
                    "result": code,
                    "id": req.id
                };
                connection.send(JSON.stringify(rsp));
            });
        }
        else {
            code = 404;
        }
	}
	
	var verifyClient = function (info,callback) {
        var req = info.req;
        var url = req.url || "";
        if(url == "/hbbtvmanager"){
            callback && callback(true);
        }
    };
	
	
	this.start = function(){
		isSlave && hbbTVDialClient.start();
		!isSlave && csLauncherDialClient.start();
		wsServer = new WebSocketServer({
            server: httpServer,
            verifyClient : verifyClient
        }).on("connection", handleReceivedConnectionFromApp);
		self.emit("ready");
        return this;
	};
	
	this.stop = function () {
		isSlave && hbbTVDialClient.stop();
        !isSlave && csLauncherDialClient.stop();
        wsServer.close();
        return this;
    };
};

util.inherits(HbbTVCSManager,events.EventEmitter);

module.exports = HbbTVCSManager;