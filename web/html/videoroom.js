const VideoRoom = (function() {

    let janus,conf,plugin;
    let tracks = {};
    let opaqueId = "videoroom";
    let room = 1234;
    
    function init(_conf) {
	conf = _conf;
	tracks = {};
        Janus.init({
            debug: false, // "all" | true,
	    callback: () => {
		janus = new Janus({
		    server: conf.janusUrl,
		    success: attachToRoom,
		    error: (error) => {
			console.error("Janus error", error);
			stop();
		    }
		})
	    }
        });
    }

    function stop() {
	delete tracks;
	if(plugin) {
	    plugin.detach();
	    plugin = null;
	}
	if(janus) {
	    janus.destroy();
	}
    }
    
    function attachToRoom() {
	janus.attach({
	    plugin: "janus.plugin.videoroom",
	    opaqueId: opaqueId,
	    
	    success: (pluginHandle) => {
		plugin = pluginHandle;
		joinRoom();
	    },

	    onmessage: (msg, jsep) => {
		// Publisher
		if(conf.publisher) {
		    if(msg.videoroom === "joined") {
			publish(true);
		    }
		}
		// Subscriber
		else {
		    if((msg.videoroom === "joined" || msg.videoroom === "event") && msg.publishers) {
			subscribe(msg.publishers);
		    }
		}
		// Handle removed streams
		const unpublished = msg["unpublished"];
		const leaving = msg["leaving"];
		if (unpublished || leaving) {		    
		    const feedId = unpublished || leaving;
		    console.log("Stream "+feedId+" ended, removing");
		    delete tracks[feedId];
		    UI.remove(feedId);
		    UI.removeVideoCtrl(feedId);
		}
		// Handle jsep
		if (jsep) {
		    plugin.handleRemoteJsep({ jsep });
		}
	    },

	    // Local stream
	    onlocaltrack: (track, added) => {
		if (added && track.kind === "video") {
		    const stream = new MediaStream([track]);
		    tracks[0] = {video: stream};
		    UI.addVideo(0,stream);
		    UI.addVideoCtrl(0,tracks[0]);
		}
	    },
	    
	    error: (error) => {
		console.error("Error attaching plugin", error);
	    },
	});
    }

    function joinRoom() {
	// Join room
	let register = {
	    request: "join",
	    room: room,
	    ptype: "publisher" // "subscriber" didn't seem to work... :(
	};
	plugin.send({ message: register });
    }

    async function publish(useAudio) {
	let tracks = [{ type: 'video', capture: true, recv: false }];

	const rearDeviceId = await getRearDeviceId();
	if(rearDeviceId)
	    tracks[0].capture = { deviceId: { exact: rearDeviceId } }
	if(useAudio) {
	    tracks.push({ type: 'audio', capture: true, recv: false });
	}
	plugin.createOffer({
	    tracks: tracks,
	    success: (jsep) => {
		let message = { request: "publish", audio: useAudio, video: true };
		plugin.send({ message: message, jsep: jsep });		
	    },
	    error: (error) => {
		console.debug("Audio device not found, trying without...", error);
		if(useAudio)
		    publish(false); // No audio input error
	    }
	});
    }

    async function getRearDeviceId() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	const videoDevices = devices.filter(device => device.kind === "videoinput");
	const rearDevice = videoDevices.find(device =>
	    device.label.toLowerCase().includes("rear") ||
	    device.label.toLowerCase().includes("back")
	);
	return (rearDevice) ? rearDevice.deviceId : false;
    }
    
    function subscribe(publishers) {
	publishers.forEach(publisher => {
	    let remoteFeed = null;
            janus.attach({
		plugin: "janus.plugin.videoroom",
		opaqueId: opaqueId,
		success: (pluginHandleRemote) => {
                    remoteFeed = pluginHandleRemote;
		    remoteFeed.rfid = publisher.id; // Group ID for tracks later
                    const message = {
			request: "join",
			room: room,
			ptype: "subscriber",
			feed: publisher.id
                    };
                    remoteFeed.send({ message: message });
		},
		onmessage: async(msg, jsep) => {
                    if (jsep) {
			remoteFeed.createAnswer({
			    jsep,
			    tracks: [{type: 'data'}],
			    success: function(jsepAnswer) {
				const body = { request: "start", room: room };
				remoteFeed.send({ message: body, jsep: jsepAnswer });
			    },
			    error: function(err) {
				console.error("createAnswer error", err);
			    }
			});
		    }
		},

		onremotetrack: (track, mid, on) => {
		    if (!track) return;
		    
		    const rfid = remoteFeed.rfid;
		    if(!tracks[rfid]) tracks[rfid] = {};
		    // New audio or video track
		    if (on) {
			let stream = new MediaStream([track]);
			if(track.kind === "audio" && !tracks[rfid].audio) {
			    console.log("Audio stream "+rfid+" arrived");
			    tracks[rfid].audio = stream;
			    UI.addAudio(rfid, stream);
			}
			else if(track.kind === "video" && !tracks[rfid].video) {
			    console.log("Video stream "+rfid+" arrived");
			    tracks[rfid].video = stream;
			    UI.addVideo(rfid, stream);
			    UI.addVideoCtrl(rfid, tracks[rfid]);
			}
		    }
		}
            });
	});
    }

    return {
	init: init,
	stop: stop
    }
})();
