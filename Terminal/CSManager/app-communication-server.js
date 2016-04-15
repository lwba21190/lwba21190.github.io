var ws = require("ws");
var util = require("util");
var events = require("events");

WebSocketServer = ws.Server;

var HbbTVApp2AppServer = function(httpServer){
	var wsServer = null;
	var pendingLocalConnections = null;
    var pendingRemoteConnections = null;
	
	function handlePendingConnectionsChanged(channel) {
        var channelPendingLocalConnections = pendingLocalConnections[channel] || [];
        var channelPendingRemoteConnections = pendingRemoteConnections[channel] || [];
        while(channelPendingLocalConnections.length>0 && channelPendingRemoteConnections.length>0){
            var localConnection = channelPendingLocalConnections.pop();
            var remoteConnection = channelPendingRemoteConnections.pop();
            localConnection.pair = remoteConnection;
            remoteConnection.pair = localConnection;
            localConnection && (localConnection.readyState == ws.OPEN) && localConnection.send("pairingcompleted");
            remoteConnection && (remoteConnection.readyState == ws.OPEN) && remoteConnection.send("pairingcompleted");
        }
        if(channelPendingLocalConnections.length == 0){
            delete  pendingLocalConnections[channel];
        }
        if(channelPendingRemoteConnections.length == 0){
            delete  pendingRemoteConnections[channel];
		}
	}
	
	var handleConnectionClosed = function (connection) {
        if(connection.local) {
            var channelPendingLocalConnections = pendingLocalConnections[connection.channel] || [];
            var index = channelPendingLocalConnections.indexOf(connection);
            index >= 0 && channelPendingLocalConnections.splice(index, 1);
            if(channelPendingLocalConnections.length == 0){
                delete  pendingLocalConnections[connection.channel];
            }
        }
        else if(connection.remote){
            var channelPendingRemoteConnections = pendingRemoteConnections[connection.channel] || [];
            var index = channelPendingRemoteConnections.indexOf(connection);
            index >= 0 && pendingRemoteConnections.splice(index, 1);
            if(channelPendingRemoteConnections.length == 0){
                delete  pendingRemoteConnections[connection.channel];
            }
        }
    };
	
	function handleConnectionReceived(connection){
		var req = connection.upgradeReq;
		if(req.channel){
			var channel = req.channel;
			connection.channel = channel;
			
			if(req.local){
				
                connection.local = true;
                var channelPendingLocalConnections = pendingLocalConnections[channel] || (pendingLocalConnections[channel] = []);
                channelPendingLocalConnections.push(connection);
            }
            else {
				console.log(channel);
                connection.remote = true;
                var channelPendingRemoteConnections = pendingRemoteConnections[channel] || (pendingRemoteConnections[channel] = []);
                channelPendingRemoteConnections.push(connection);
            }
			handlePendingConnectionsChanged(channel);
            connection.on("message", function(msg, flags) {
                var options = {};
                flags.binary && (options.binary = true);
                flags.masked && (options.masked = true);
                if (flags && flags.binary) {
                    connection.pair && (connection.pair.readyState == ws.OPEN) && connection.pair.send(msg, options);
                }
                else {
                    connection.pair && (connection.pair.readyState == ws.OPEN) && connection.pair.send(msg, options);
                }
            });
            connection.on("close", function(code, reason) {
                if(connection.pair){
                    connection.pair.close();
                    connection.pair = null;
                }
                else {
                    handleConnectionClosed(connection);
                }
                connection = null;
            });
            connection.on("error", function () {
            });
		}
		
	}
	
	var verifyClient = function (info,callback) {
        var req = info.req;
        var url = req.url || "";
        var channel = null;
        var verified;
        var code;
        if(url.indexOf("/local/") == 0){
            channel = url.substr(7) || null;
            req.local = true;
        }
        else if(url.indexOf("/remote/") == 0){
            channel = url.substr(8) || null;
            req.local = false;
        }
        if(channel){
            req.channel = channel;
            verified = true;
            callback && callback(verified);
        }
/*         else{
			verified = false;
			code = 400;
         }
         try{
			callback(verified,code);
         }
         catch (e){
			console.error("Error on verify client",e);
         } */
    };

	function reset() {
        wsServer && wsServer.close();
        wsServer = null;
        pendingLocalConnections = [];
        pendingRemoteConnections = [];
    };
	
	this.start = function(){
		reset();
		wsServer = new WebSocketServer({
			server:httpServer,
			verifyClient:verifyClient
		}).on("connection",handleConnectionReceived);
		this.emit("ready");
        return this;
	}
	
	
	this.stop = function () {
        reset();
        this.emit("stop");
        return this;
    };
}

util.inherits(HbbTVApp2AppServer, events.EventEmitter);

module.exports = HbbTVApp2AppServer;