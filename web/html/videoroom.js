const VideoRoom = function() {

    let janus,conf,plugin = null;
    let opaqueId = "videoroom"; // "room-"+Janus.randomString(12);
    let room = 1234;
    
    function init(_conf) {
	conf = _conf;
	
	Layout.init(conf.gridId);
	
        Janus.init({
            debug: false, // "all" | true,
	    callback: () => {
		janus = new Janus({
		    server: conf.janusUrl,
		    success: attachToRoom,
		    error: (error) => {
			console.error("Janus init error", error);
		    },
		    destroyed: () => {
			console.log("Janus destroyed");
		    }
		})
	    }
        });
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
		if (jsep) {
		    plugin.handleRemoteJsep({ jsep });
		}
	    },
	    
	    onlocaltrack: (track, added) => {
		if (added && track.kind === "video") {
		    const stream = new MediaStream([track]);
		    uiAddVideo("local",stream);
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
		console.error("WebRTC error:", error);
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
		    remoteFeed.remoteTracks = {};		
		    remoteFeed.rfid = publisher.id; // Group ID for tracks later
                    const message = {
			request: "join",
			room: room,
			ptype: "subscriber",
			feed: publisher.id
                    };
                    remoteFeed.send({ message: message });
		},
		onmessage: (msg, jsep) => {
                    const event = msg["videoroom"];
                    if (jsep) {
			remoteFeed.createAnswer({
                            jsep,
                            tracks: [], // {type: "data"}],
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
		    // Track added
		    if (on) {
			let stream = new MediaStream([track]);
			remoteFeed.remoteTracks[mid] = stream;
			if(track.kind === "audio")
			    uiAddAudio(rfid, stream);
			else if(track.kind === "video")
			    uiAddVideo(rfid, stream);
		    }
		    // Track removed
		    else {
			delete remoteFeed.remoteTracks[mid];
			uiRemove(rfid);
		    }
		}
            });
	});
    }

    // TODO: Move all uiXXX functions somewhere else
    function uiAddVideo(id, stream) {
	if(document.getElementById('vid_'+id)) return;
	console.log("Adding video for "+id+"...");
	
	let video = document.createElement("video");
	video.id = "vid_"+id;
	video.autoplay = true;
	video.playsInline = true;
	video.srcObject = stream;
	video.muted = true;
	
	const cell = uiVideoCell(id);
	const wrap = uiVideoWrap();
	wrap.appendChild(video);
	cell.appendChild(wrap);

	VideoCover.apply(wrap,video);
	Layout.add(cell);
    }

    function uiAddAudio(id, stream) {
	if(document.getElementById('aud_'+id)) return;	
	console.log("Adding audio for "+id+"...");
	
	let audio = document.createElement("audio");
	audio.id = "aud_"+id;
	audio.style = "display:none;";
	audio.autoplay = true;
	audio.playsInline = true;
	audio.srcObject = stream;

	const cell = uiVideoCell(id);
	cell.appendChild(audio);
	Layout.add(cell);
    }

    function uiVideoWrap(id) {
	wrap = document.createElement("div");
	wrap.className = "video-wrapper";
	return wrap;
    }
    
    function uiVideoCell(id) {
	let div = document.getElementById('cont_'+id);
	if(div)
	    return div;
	div = document.createElement("div");
	div.className = "video-cell";
	div.id = "cont_"+id;
	return div;
    }

    function uiRemove(id) {
	console.log("Removing "+id+"...");
	Layout.remove($('#cont_'+id).get(0));
    }
    
    return {
	init: init
    }
}();
