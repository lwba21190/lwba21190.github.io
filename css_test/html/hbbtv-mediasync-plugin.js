(function(){
	var ws = null;
	var mediaSyncManagerClient = null;
	var jsonRpcCount = 1;
	var pendingJsonRpcRequests = {};
	
	var connect = function(url){
		ws && ws.close();
		ws = new WebSocket(url);
	
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
		};
	};
	
	var sendJsonRpcRequest = function (req, callback) {
		if(!req.id){
			req.id = jsonRpcCount++;
		}
		if(callback){
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
					console.error("the mediaSyncManagerClient response is not a valid rpc message",err);
				}
			}
		}
	};
	
	var CorrelationTimestamp = function(tlvMaster,tlvOther){
		this.tlvMaster = tlvMaster;
		this.tlvOther = tlvOther;
	}
	
	var onError = function(lastError,lastErrorSource){
		
	}
	
	var onSyncNowAchievable = function(mediaObject){
		
	}
	
	var onInterDeviceSyncDispersionUpdate = function(){
		
	}
	
	var initMediaSynchroniser = function(mediaObject,timelineSelector){
		return sendJsonRpcRequest({
			jsonrpc: "2.0",
			method: "initMediaSynchroniser",
			params: [mediaObject,timelineSelector]
		},function(rsp){
			console.log(rsp.result);
		});
	}
	
	var initSlaveMediaSynchroniser = function(css_ci_service_url){
		return sendJsonRpcRequest({
			jsonrpc: "2.0",
			method: "initSlaveMediaSynchroniser",
			params: [css_ci_service_url]
		},function(rsp){
			console.log(rsp.result);
		});
	}
	
	var addMediaObject = function(mediaObject,timelineSelector,correlationTimestamp,tolerance,multiDecoderMode){
	
	}
	
	var removeMediaObject = function(mediaObject){
		
	}
	
	var updateCorrelationTimestamp = function(mediaObject,correlationTimestamp){
		
	}
	
	var enableInterDeviceSync = function(callback){
		return sendJsonRpcRequest({
			jsonrpc: "2.0",
			method: "enableInterDeviceSync",
			params: []
		},function(rsp){
			console.log(rsp.result);
			callback && callback.call(null,rsp.result);
		});
	};
		
	var disableInterDeviceSync = function(callback){
		return sendJsonRpcRequest({
			jsonrpc: "2.0",
			method: "disableInterDeviceSync",
			params: []
		},function(rsp){
			console.log(rsp.result);
			callback && callback.call(null,rsp.result);
		});
	}
	
	var HbbTVMediaSynchroniser = function(){ 
		this.onError = onError; 
		this.onSyncNowAchievable = onSyncNowAchievable;
		this.lastError = 0;
		this.lastErrorSource = null;
		this.nrOfSlaves = 0;
		this.interDeviceSyncEnabled = false;
		this.interDeviceSyncDispersion;
		this.onInterDeviceSyncDispersionUpdate =  onInterDeviceSyncDispersionUpdate;
		this.minSyncBufferSize = 0;
		this.maxBroadbandStreamsWithBroadcast = 1;
		this.maxBroadbandStreamsNoBroadcast = 2;
		this.currentTime;
		this.initMediaSynchroniser = initMediaSynchroniser;
		this.initSlaveMediaSynchroniser = initSlaveMediaSynchroniser;
		this.addMediaObject = addMediaObject;
		this.removeMediaObject = removeMediaObject;
		this.updateCorrelationTimestamp = updateCorrelationTimestamp;
		this.enableInterDeviceSync = enableInterDeviceSync;
		this.disableInterDeviceSync = disableInterDeviceSync;

		this.connect = connect;//测试使用，实际不应该作为HbbTVMediaSynchroniser属性
		
	};
	
	window.oipfObjectFactory = window.oipfObjectFactory || {};
	window.oipfObjectFactory.createMediaSynchroniser = oipfObjectFactory.createMediaSynchroniser || function(){
		return new HbbTVMediaSynchroniser()
	}
})();