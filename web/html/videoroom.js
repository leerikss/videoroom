const VideoRoom = function() {

    let janus,conf,plugin;
    let tracks = {};
    let opaqueId = "videoroom"; // "room-"+Janus.randomString(12);
    let room = 1234;
    
    function init(_conf) {
	conf = _conf;
	
	Layout.init(conf.gridId);
	
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
		    uiRemove(feedId, true);
		}
		// Handle jsep
		if (jsep) {
		    plugin.handleRemoteJsep({ jsep });
		}
	    },
	    
	    onlocaltrack: (track, added) => {
		if (added && track.kind === "video") {
		    const stream = new MediaStream([track]);
		    uiAddVideo(0,stream,true);
		    plugin.localStream = stream;    
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
			    uiAddAudio(rfid, stream);
			} else if(track.kind === "video" && !tracks[rfid].video) {
			    console.log("Video stream "+rfid+" arrived");
			    tracks[rfid].video = stream;
			    uiAddVideo(rfid, stream, true);
			}
		    }
		}
            });
	});
    }

    // TODO: Move all uiXXX functions somewhere else
    function uiAddVideo(rfid, stream, addCtrl) {
	if(document.getElementById('vid_'+rfid)) return;
	
	let video = document.createElement("video");
	video.id = "vid_"+rfid;
	video.autoplay = true;
	video.playsInline = true;
	video.srcObject = stream;
	video.muted = true;
	
	const cell = uiVideoCell(rfid);
	const wrap = uiVideoWrap();
	wrap.appendChild(video);
	cell.appendChild(wrap);

	VideoCover.apply(wrap,video);
	Layout.add(cell);
	if(addCtrl) {
	    uiAddVideoCtrl(rfid);
	}
    }

    function uiAddAudio(rfid, stream) {
	if(document.getElementById('aud_'+rfid)) return;
	
	let audio = document.createElement("audio");
	audio.id = "aud_"+rfid;
	audio.style = "display:none;";
	audio.autoplay = true;
	audio.playsInline = true;
	audio.srcObject = stream;

	const cell = uiVideoCell(rfid);
	cell.appendChild(audio);
	Layout.add(cell);
    }

    function uiVideoCell(rfid) {
	let div = document.getElementById('cont_'+rfid);
	if(div)
	    return div;
	div = document.createElement("div");
	div.className = "video-cell";
	div.id = "cont_"+rfid;
	return div;
    }

    function uiVideoWrap() {
	wrap = document.createElement("div");
	wrap.className = "video-wrapper";
	return wrap;
    }
    
    function uiRemove(rfid, delCtrl) {
	if(delCtrl) {
	    uiDelVideoCtrl(rfid);
	}
	Layout.remove($('#cont_'+rfid).get(0));
    }

    function uiAddVideoCtrl(rfid) {
	$("#control-box")
	    .append('<button class="control-button" id="videoCtrl_'+rfid+'" title="Hide Video">'+
		    '<i id="videoCtrlAlt_'+rfid+'" class="fas fa-video-slash"></i></button>');
	$("#videoCtrl_"+rfid).click(() => {
	    const el = $('#videoCtrlAlt_'+rfid);
	    if(el.hasClass('fa-video-slash')) {
		el.addClass('fa-video').removeClass('fa-video-slash');
		uiRemove(rfid, false);
	    } else if(el.hasClass('fa-video')) {
		el.addClass('fa-video-slash').removeClass('fa-video');
		if(plugin && plugin.localStream) {
		    uiAddVideo(0, plugin.localStream, false);
		}
		else if(tracks && tracks[rfid]) {
		    if(tracks[rfid].video) {
			uiAddVideo(rfid, tracks[rfid].video, false);
		    }
		    if(tracks[rfid].audio) {
			uiAddAudio(rfid, tracks[rfid].audio);
		    }
		}
	    }
	});
	$("#control-box").show();
    }
    
    function uiDelVideoCtrl(rfid) {
	$("#videoCtrl_"+rfid).remove();
	if($("#control-box").children().length == 0) {
	    $("#control-box").hide();
	}
    }

    return {
	init: init,
	stop: stop
    }
}();
