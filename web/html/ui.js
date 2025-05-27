const UI = (function() {

    function addVideo(rfid, stream) {
	if(document.getElementById('vid_'+rfid)) return;
	
	let video = document.createElement("video");
	video.id = "vid_"+rfid;
	video.autoplay = true;
	video.playsInline = true;
	video.srcObject = stream;
	video.muted = true;
	
	const cell = getVideoCell(rfid);
	const wrap = getVideoWrap();
	wrap.appendChild(video);
	cell.appendChild(wrap);

	VideoCover.apply(wrap,video);
	Layout.add(cell);
    }

    function addAudio(rfid, stream) {
	if(document.getElementById('aud_'+rfid)) return;
	
	let audio = document.createElement("audio");
	audio.id = "aud_"+rfid;
	audio.style = "display:none;";
	audio.autoplay = true;
	audio.playsInline = true;
	audio.srcObject = stream;

	const cell = getVideoCell(rfid);
	cell.appendChild(audio);
	Layout.add(cell);
    }

    function remove(rfid) {
	Layout.remove($('#cont_'+rfid).get(0));
    }

    function addVideoCtrl(rfid,track) {
	$("#control-box")
	    .append('<button class="control-button" id="videoCtrl_'+rfid+'" title="Hide Video">'+
		    '<i id="videoCtrlAlt_'+rfid+'" class="fas fa-video-slash"></i></button>');
	$("#videoCtrl_"+rfid).click(() => {
	    const el = $('#videoCtrlAlt_'+rfid);
	    if(el.hasClass('fa-video-slash')) {
		el.addClass('fa-video').removeClass('fa-video-slash');
		remove(rfid);
	    } else if(el.hasClass('fa-video')) {
		el.addClass('fa-video-slash').removeClass('fa-video');
		if(track && track.video) {
		    addVideo(rfid, track.video);
		}
		if(track && track.audio) {
		    addAudio(rfid, track.audio);
		}
	    }
	});
	$("#control-box").show();
    }

    function removeVideoCtrl(rfid) {
	$("#videoCtrl_"+rfid).remove();
	if($("#control-box").children().length == 0) {
	    $("#control-box").hide();
	}
    }
    
    function getVideoCell(rfid) {
	let div = document.getElementById('cont_'+rfid);
	if(div)
	    return div;
	div = document.createElement("div");
	div.className = "video-cell";
	div.id = "cont_"+rfid;
	return div;
    }

    function getVideoWrap() {
	wrap = document.createElement("div");
	wrap.className = "video-wrapper";
	return wrap;
    }
    
    return {
	addVideo: addVideo,
	addAudio: addAudio,
	remove: remove,
	addVideoCtrl: addVideoCtrl,
	removeVideoCtrl: removeVideoCtrl
    }
})();
