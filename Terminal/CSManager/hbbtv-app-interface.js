(function(){

	var ws = null;
	var jsonRpcCount = 1;
	var pendingJsonRpcRequests = {};
	var csLauncherCounter = 1;
	var terminalCounter = 1;
	var discoveredCSLaunchers = {};
	var discoveredTerminals = {};
	var app2AppLocalUrl = "ws://192.168.1.108:8080/local/";
    var app2AppRemoteUrl = null;
	var appLaunchUrl = "http://192.168.1.108:8080/dial/apps/HbbTV";
	var interDevSyncURL = null;

    var DiscoveredTerminal = function(enum_id,friendly_name,X_HbbTV_App2AppURL,X_HbbTV_InterDevSyncURL,X_HbbTV_UserAgent){
        this.enum_id = enum_id;
        this.friendly_name = friendly_name;
        this.x_HbbTV_App2AppURL = X_HbbTV_App2AppURL;
        this.x_HbbTV_InterDevSyncURL = X_HbbTV_InterDevSyncURL;
        this.x_HbbTV_UserAgent = X_HbbTV_UserAgent;

    };

    var DiscoveredCSLauncher = function(enum_id,friendly_name,CS_OS_id){
        this.enum_id = enum_id;
        this.friendly_name = friendly_name;
        this.CS_OS_id = CS_OS_id;
    };
	
	var discoverCSLaunchers = function(onCSDiscovery){
		return sendJsonRpcRequest({
			jsonrpc: "2.0",
            method: "discoverCSLaunchers",
            params: []
		},function(rsp){
			var csLaunchers = rsp.result;
            var CSLauncherInfoBuffer = [];
            for(var appUrl in csLaunchers){
                var oldLauncher = discoveredCSLaunchers[appUrl];
                var launcher = csLaunchers[appUrl];
                launcher.id = appUrl;
                var enumId = oldLauncher && oldLauncher.enum_id || csLauncherCounter++;
                var newCsLauncher = new DiscoveredCSLauncher(enumId, launcher.friendlyName, launcher.csOsId);
                discoveredCSLaunchers[appUrl] = newCsLauncher;
                discoveredCSLaunchers[enumId] = launcher;
                CSLauncherInfoBuffer.push(newCsLauncher);
            }
            onCSDiscovery && onCSDiscovery.call(null,CSLauncherInfoBuffer);
		});
	};
	
	var discoverTerminals = function(onTerminalDiscovery){
        return sendJsonRpcRequest({
            jsonrpc: "2.0",
            method: "discoverTerminals",
            params: []
        }, function (rsp) {
            var terminals = rsp.result;
            var TerminalInfoBuffer = [];
            for(var appUrl in terminals){
                var oldTerminal = discoveredTerminals[appUrl];
                var terminal = terminals[appUrl];
                terminal.id = appUrl;
                var enumId = oldTerminal && oldTerminal.enumId || terminalCounter++;
				app2AppRemoteUrl = terminal.app2AppURL;
				interDevSyncURL = terminal.interDevSyncURL;
                var newTerminal = new DiscoveredTerminal(enumId, terminal.friendlyName, terminal.app2AppURL, terminal.interDevSyncURL, terminal.userAgent);
                discoveredTerminals[appUrl] = newTerminal;
                discoveredTerminals[enumId] = terminal;
                TerminalInfoBuffer.push(newTerminal);
            }
            onTerminalDiscovery && onTerminalDiscovery.call(null,TerminalInfoBuffer);
        });
	};

	var launchCSApp = function(enumId,payload,onCSLaunch){
		var csLauncher = discoveredCSLaunchers[enumId];
        var code = null;
        if(!csLauncher || typeof payload != "string"){
            code = 3;
            onCSLaunch && onCSLaunch.call(null,enumId,code);
            return false;
        }
        return sendJsonRpcRequest({
            jsonrpc: "2.0",
            method: "launchCSApp",
            params: [csLauncher.id, payload]
        }, function (rsp) {
            var code = rsp.result;
            onCSLaunch && onCSLaunch.call(null,enumId,code);
        });
	};

	var getInterDevSyncURL = function(){
		return interDevSyncURL;
	};

	var getAppLaunchURL = function(){
		return appLaunchUrl;
	};

	var getApp2AppLocalBaseURL = function(){
		return app2AppLocalUrl;
	};

	var getApp2AppRemoteBaseURL = function(){
		return app2AppRemoteUrl;
	};
	
	var HbbTVCSManager = function(){
		this.discoverCSLaunchers = discoverCSLaunchers;
		this.discoverTerminals = discoverTerminals;
		this.launchCSApp = launchCSApp;
		this.getInterDevSyncURL =  getInterDevSyncURL;
		this.getAppLaunchURL = getAppLaunchURL;
		this.getApp2AppLocalBaseURL = getApp2AppLocalBaseURL;
		this.getApp2AppRemoteBaseURL = getApp2AppRemoteBaseURL;
	}

	function connectAppToCSManager(){
		ws && ws.close();
		ws = new WebSocket("ws://192.168.1.108:8080/hbbtvmanager");
		
		ws.onopen = function(evt){
			console.log("ws open");
		};
		
		ws.onclose = function(evt){
			console.log("ws close");
		};
		
		ws.onerror = function(evt){
			console.log("ws error");
		};
		
		ws.onmessage = function(evt){
			try{
                var rsp = JSON.parse(evt.data);
                handleJsonRpcResponse(rsp);
            }
            catch(err){
                console.error("Error on parsing or handling rpc response",err);
            }
		}
	}
	
	var sendJsonRpcRequest = function (req, callback) {
        if(!req.id){
            req.id = jsonRpcCount++;
        }
        if(callback && ws){
            pendingJsonRpcRequests[req.id] = {
                req: req,
                callback: callback
            };
            ws.send(JSON.stringify(req));
            return true;
        }
        return false;
    };

    var handleJsonRpcResponse = function (rsp) {
        var id = rsp.id;
        var pendingReq = pendingJsonRpcRequests[id];
        if(pendingReq){
            if(pendingReq.callback){
                try{
                    var req = pendingReq.req || null;
                    pendingReq.callback.call(req,rsp);
                }
                catch (err){
                    console.error("the ws response is not a valid rpc message",err);
                }

            }
        }
    };


	window.oipfObjectFactory = window.oipfObjectFactory || {};
	window.oipfObjectFactory.createCSManager = oipfObjectFactory.createCSManager || function(){
		return new HbbTVCSManager();
	};

	connectAppToCSManager();

})();


