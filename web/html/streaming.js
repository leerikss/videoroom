const Streaming = (function() {

    let janus,conf,plugin,streams;
    let streamPoller;
    
    const DEAD_STREAM_MS = 5000;
    const POLL_INTERVAL_MS = 5000;
    
    function init(_conf) {
	      conf = _conf;
        Janus.init({
            debug: true,
            callback: () => {
		            janus = new Janus({
		                server: conf.janusUrl,
		                success: attachStreams,
		                error: (error) => {
			                  console.error("Janus error", error);
			                  stop(); 
		                }
		            })
            }
        });        
    }

    function stop() {
	      if(plugin) {
	          plugin.detach();
	          plugin = null;
	      }
	      if(janus) {
	          janus.destroy();
	      }
        if(streamPoller) {
            clearInterval(streamPoller);
        }
        delete streams;
    }

    function attachStreams() {
        streams = {};
        janus.attach({
            plugin: "janus.plugin.streaming",
            success: (pluginHandle) => {
                plugin = pluginHandle;
                pollStreams();
                streamPoller = setInterval(pollStreams, POLL_INTERVAL_MS);
            },
	          onmessage: (msg, jsep) => {
                if(!msg || !msg.result || !msg.result.status)
                    return;
                var status = msg.result.status;
                console.log("onmessage: status = " + status);
                // Create answer
                if (status === "preparing" && jsep !== undefined)
                    createAnswer(jsep);
            },
		        onremotetrack: (track, mid, on) => {
		            if (!track) return;
		            // New audio or video track
		            if (on) {
			              let stream = new MediaStream([track]);
                    const streamId = plugin.currentStreamId;
                    streams[streamId] = streams[streamId] || {};
			              if(track.kind === "audio" && !streams[streamId].audio) {
			                  console.log("Audio stream "+streamId+" arrived");
                        streams[streamId].audio = stream;
			                  UI.addAudio(streamId, stream);
			              }
			              else if(track.kind === "video" && !streams[streamId].video) {
			                  console.log("Video stream "+streamId+" arrived");
                        streams[streamId].video = stream;                        
			                  UI.addVideo(streamId, stream);
			                  UI.addVideoCtrl(streamId, streams[streamId]);
			              }
		            }
            }
        });
    }
    
    function pollStreams() {
        console.log("Polling streams...");
        plugin.send({
            "message": { "request": "list" },
            "success": result => {
                if (result !== undefined && result["list"] !== undefined)
                    handleStreams(result["list"]);
            }
        });        
    }

    function handleStreams(streamsList) {
        streamsList.forEach(stream => {
            plugin.send({
                message: { request: "info", id: stream.id },
                success: o => {
                    if(o && o.info && o.info.media && o.info.media.length > 0) {
                        if(o.info.media[0].age_ms < DEAD_STREAM_MS) {
                            if(!streams[o.info.id] || !streams[o.info.id].video) {
                                console.log("Requesting watch for id "+o.info.id+"...");
                                requestWatch(stream);
                            }
                        } else {
                            if(!streams[o.info.id]) return;
                            console.log("Removing id "+o.info.id+"...");                        
		                        UI.remove(o.info.id);
		                        UI.removeVideoCtrl(o.info.id);
                            delete streams[o.info.id];
                        }
                    }
                }
            });
        });
    }

    function requestWatch(stream) {
        console.log("Requesting to watch stream");
        console.log(stream);
        plugin.send({
            "message": {
                "request": "watch",
                id: stream.id
            },
            "success": () => {
                plugin.currentStreamId = stream.id;
            }
        });
    }

    function createAnswer(jsep) {
        console.log("Create answer");
        plugin.createAnswer({
            "jsep": jsep,
            // "pin": config.pin,
            "media": { "audio": false, "video": false },
            "success": (jsep) => requestStart(jsep),
            "error": function(error) {
                console.error("WebRTC error: ", error);
            }
        });
    }

    function requestStart(jsep) {
        console.log("Requesting start...");
        plugin.send({
            "message": { "request": "start" },
            "jsep": jsep
        });
    }
    
    return {
	      init: init,
	      stop: stop
    }
    
})();
