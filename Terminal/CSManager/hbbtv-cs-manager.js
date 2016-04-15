var util = require("../node_modules/util");
var ws = require("../node_modules/ws");
var events = require("../node_modules/events");
var CsLauncherDialClient = require("./cslauncher-dial-client.js");

var HbbTVCSManager = function(httpServer){	
	var csLauncherDialClient = new CsLauncherDialClient();
	var wsServer = null;
	var csLaunchers = {};
	var csLaunchersInfo = {};
	var self = this
	
	csLauncherDialClient.on("ready",function(){
		console.log("cs Launcher client ready");
	}).on("found",function(csLauncher){
		csLaunchers[csLauncher.getAppLaunchURL()] = csLauncher;
        csLaunchersInfo[csLauncher.getAppLaunchURL()] = csLauncher.getInfo();
	}).on("disappear",function(deviceDescriptionUrl){
		delete csLaunchers[deviceDescriptionUrl];
        delete csLaunchersInfo[deviceDescriptionUrl];
	}).on("stop",function(){
		self.emit("stop");
	}).on("error",function(err){
		self.emit("error",err);
	});
	
	var handleReceivedConnectionFromApp = function(connection) {
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
		//csLauncherDialClient.state == "stop" ? csLauncherDialClient.start(): csLauncherDialClient.refresh();
		
		csLauncherDialClient.refresh();
		var rsp = {
			"jsonrpc": "2.0",
			"result": csLaunchersInfo,
			"id": req.id
		};
		connection.send(JSON.stringify(rsp));
	}
	
	function discoverTerminals(connection,req){
		// terminalDialClient.refresh();
		// var rsp = {
			// "jsonrpc": "2.0",
			// "result": terminalInfo,
			// "id": req.id
		// };
		// connection.send(JSON.stringify(rsp));
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
		csLauncherDialClient.start();
		wsServer = new WebSocketServer({
            server: httpServer,
            verifyClient : verifyClient
        }).on("connection", handleReceivedConnectionFromApp);
		self.emit("ready");
        return this;
	};
	
	this.stop = function () {
        csLauncherDialClient.stop();
        wsServer.close();
        return this;
    };
};

util.inherits(HbbTVCSManager,events.EventEmitter);

module.exports = HbbTVCSManager;