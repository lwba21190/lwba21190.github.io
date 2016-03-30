/**
 * Created by liwenb on 2016/3/21.
 */
(function(){

    var parseParameters = function(query){
        var dict = {};
        query = query.substr(query.lastIndexOf("#")+1);
        if(query){
            var params = query.split("&");
            for (var i = 0; i < params.length; i++) {
                var index = params[i].indexOf("=");
                var key = index>-1?params[i].substr(0,index):params[i];
                var value = index>-1?params[i].substr(index+1):"";
                if(typeof dict[key] == "undefined"){
                    dict[key] = value;
                }
                else if(typeof dict[key] == "string"){
                    dict[key] = [dict[key],value];
                }
                else if(typeof dict[key] == "object"){
                    dict[key].push(value);
                }
            };
        }
        return dict;
    };

    var connect = function(){
        ws && ws.close();
        ws = new WebSocket(hbbtvCsManagerUrl);
        ws.onopen = function(evt){
            console.log("ws open");
        };
        ws.onclose = function(evt){
            console.log("ws close");
            if(this == ws){
                ws = null;
            }
        };
        ws.onerror = function(evt){
            console.log("ws error");
        };
        ws.onmessage = function(evt){
            try{
                var rsp = JSON.parse(evt.data);
                handleRpcResponse(rsp);
            }
            catch(err){
                console.error("ws comunication error");
            }
        };
    };

    var sendRpcRequest = function(req,callback){
        if(!req.id){
            req.id = rpcCounter++;
        }
        if(callback && ws){
            pendingRpcRequests[req.id] = {
                req:req,
                callback:callback
            };
            ws.send(JSON.stringify(req));
            return true;
        }
        return false;
    };

    var handleRpcResponse = function(rsp){
        var id = rsp.id;
        var pendingRpc = pendingRpcRequests[id];
        if(pendingRpc){
            if(pendingRpc.callback){
                try{
                    var req = pendingRpc.req || null;
                    pendingRpc.callback.call(req,rsp);
                }
                catch(err){
                    console.error("handle info error");
                }
            }
        }
    };

    var hash = location.hash.substr(location.hash.lastIndexOf("#")+1);
    var hashParameters = parseParameters(hash);
    var port = hashParameters.port;
    var hostname = "192.168.2.100";
    var app2AppLocalUrl = port && "ws://192.168.2.100:"+port+"/local/" || null;
    var app2AppRemoteUrl = port && hostname && "ws://"+hostname+":"+port+"/remote/" || null;
    var hbbtvCsManagerUrl = "ws://192.168.2.101:"+port+"/hbbtvmanager";
    var userAgent = navigator.userAgent;
    var appLaunchUrl = port && hostname && "http://"+hostname+":"+port+"/dial/apps/HbbTV" || null;
    var ws = null;
    var rpcCounter = 1;
    var pendingRpcRequests = {};
    var csLauncherCounter = 1;
    var discoveredLaunchers = {};
    var terminalCounter = 1;
    var discoveredTerminals = {};


    var DiscoveredTerminal = function(enum_id,friendly_name,x_HbbTV_App2AppURL,x_HbbTV_InterDevSyncURL,x_HbbTV_UserAgent){
        this.enum_id = enum_id;
        this.friendly_name = friendly_name;
        this.x_HbbTV_App2AppURL = x_HbbTV_App2AppURL;
        this.x_HbbTV_InterDevSyncURL = x_HbbTV_InterDevSyncURL;
        this.x_HbbTV_UserAgent = x_HbbTV_UserAgent;

    };

    var DiscoveredCSLauncher = function(enum_id,friendly_name,CS_OS_id){
        this.enum_id = enum_id;
        this.friendly_name = friendly_name;
        this.CS_OS_id = CS_OS_id;
    };

    var discoverCSLaunchers = function(onCSDiscovery){
        return sendRpcRequest({
            jsonrpc: "2.0",
            method: "discoverCSLaunchers",
            params: []
        }, function (rsp) {
            var csLaunchers = rsp.result;
            var res = [];
            for(var appUrl in csLaunchers){
                var oldLauncher = discoveredLaunchers[appUrl];
                var launcher = csLaunchers[appUrl];
                launcher.id = appUrl;
                var enumId = oldLauncher && oldLauncher.enum_id || csLauncherCounter++;
                var newCsLauncher = new DiscoveredCSLauncher(enumId, launcher.friendlyName, launcher.csOsId);
                discoveredLaunchers[appUrl] = newCsLauncher;
                discoveredLaunchers[enumId] = launcher;
                res.push(newCsLauncher);
            }
            onCSDiscovery && onCSDiscovery.call(null,res);
        });
    };


    var discoverTerminals = function(onTerminalDiscovery){
        return sendRpcRequest({
            jsonrpc: "2.0",
            method: "discoverTerminals",
            params: []
        }, function (rsp) {
            var terminals = rsp.result;
            var res = [];
            for(var appUrl in terminals){
                var oldTerminal = discoveredTerminals[appUrl];
                var terminal = terminals[appUrl];
                terminal.id = appUrl;
                var enumId = oldTerminal && oldTerminal.enumId || terminalCounter++;
                var newTerminal = new DiscoveredTerminal(enumId, terminal.friendlyName, terminal.app2AppURL, terminal.interDevSyncURL, terminal.userAgent);
                discoveredTerminals[appUrl] = newTerminal;
                discoveredTerminals[enumId] = terminal;
                res.push(newTerminal);
            }
            onTerminalDiscovery && onTerminalDiscovery.call(null,res);
        });
    };

    var launchCSApp = function(enumId,payload,onCSlaunch){
        var csLauncher = discoveredLaunchers[enumId];
        var code = null;
        if(!csLauncher || typeof payload != "string"){
            code = 3;
            onCSLaunch && onCSLaunch.call(null,enumId,code);
            return false;
        }
        return sendRpcRequest({
            jsonrpc: "2.0",
            method: "launchCSApp",
            params: [csLauncher.id, payload]
        }, function (rsp) {
            var code = rsp.result;
            onCSLaunch && onCSLaunch.call(null,enumId,code);
        });
    };

    var launchHbbTVApp = function(enumId,options,onHbbTVLaunch){
        var terminal = discoveredTerminals[enumId];
        var code = null;
        if(!terminal){
            code = 3;
            onHbbTVLaunch && onHbbTVLaunch.call(null,enumId,code);
            return false;
        }
        return sendRpcRequest({
            jsonrpc: "2.0",
            method: "launchHbbTVApp",
            params: [terminal.id, options]
        }, function (rsp) {
            var code = rsp.result;
            // TODO
            onHbbTVLaunch && onHbbTVLaunch.call(null,enumId,code);
        });
    };

    /**
     * 返回master端CSS-CII服务端点的URL
     */
    var getInterDevSyncURL =function(){
        console.warn("HbbTVCSManager.getInterDevSyncURL is not supported yet");
        return "";
    };

    /**
     * 返回HbbTV Terminal的App Launcher服务端点的URL。
     */
    var getAppLaunchURL = function(){
        return appLaunchUrl;
    };

    /**
     * 返回App到App通信时的本地服务器端点的URL
     */
    var getApp2AppLocalBaseURL =function(){
        return app2AppLocalUrl;
    };

    /**
     * 返回App到App通信时的远程服务器端点的URL
     */
    var getApp2AppRemoteBaseURL =function(){
        return app2AppRemoteUrl;
    };

    var HbbTVCSManager = function(){
        this.discoverCSLaunchers = discoverCSLaunchers;
        this.discoverTerminals = discoverTerminals;
        this.launchCSApp = launchCSApp;
        this.launchHbbTVApp = launchHbbTVApp;
        this.getInterDevSyncURL =  getInterDevSyncURL;
        this.getAppLaunchURL = getAppLaunchURL;
        this.getApp2AppLocalBaseURL = getApp2AppLocalBaseURL;
        this.getApp2AppRemoteBaseURL = getApp2AppRemoteBaseURL;
    };

    var HbbTVTerminalManager = function(){
        this.discoverTerminals = discoverTerminals;
        this.launchHbbTVApp = launchHbbTVApp;
    };

    if(port == "8080") {
        window.oipfObjectFactory = window.oipfObjectFactory || {};
        window.oipfObjectFactory.createCSManager = oipfObjectFactory.createCSManager || function(){
                return new HbbTVCSManager();
            };
        connect();
    }
    else if(port == "8090") {
        window.hbbtv = window.hbbtv || {};
        window.hbbtv.createTerminalManager = function(){
            return new HbbTVTerminalManager();
        };
        connect();
    }
})();