const VideoCover = (function() {

    let scale = 1;
    let lastScale = 1;
    let pos = { x: 0, y: 0 };
    let lastPos = { x: 0, y: 0 };

    let initialDistance = null;
    let isDragging = false;
    
    function apply(wrapper, video) {
	if(!wrapper || !video) return;

	// Initial render
	video.addEventListener('loadedmetadata', () => {
	    rerender(wrapper,video);
	});

	// When videos disappear/appear parent element resizes
	const observer = new ResizeObserver(() => {
	    rerender(wrapper,video);	    
	});
	observer.observe(wrapper.parentElement);
	
	wrapper.addEventListener('touchstart', e => {
	    if (e.touches.length === 2) {
		initialDistance = getDistance(e.touches);
		lastScale = scale;
	    } else if (e.touches.length === 1) {
		isDragging = true;
		lastPos = { x: e.touches[0].clientX - pos.x, y: e.touches[0].clientY - pos.y };
	    }
	});
	
	wrapper.addEventListener('touchmove', e => {
	    e.preventDefault();

	    if (e.touches.length === 2 && initialDistance) {
		const newDistance = getDistance(e.touches);
		scale = Math.max(1, Math.min(4, lastScale * (newDistance / initialDistance)));
	    } else if (e.touches.length === 1 && isDragging) {
		pos.x = e.touches[0].clientX - lastPos.x;
		pos.y = e.touches[0].clientY - lastPos.y;
	    }
	    applyTransform(video);
	});

	wrapper.addEventListener('touchend', e => {
	    if (e.touches.length < 2) initialDistance = null;
	    if (e.touches.length === 0) isDragging = false;
	});
    }

    function rerender(wrapper,video) {
	fitToCover(wrapper,video); // Simulate object-fit: cover
	applyTransform(video);
    }
    
    function fitToCover(wrapper,video) {
	const wrapperW = wrapper.offsetWidth;
	const wrapperH = wrapper.offsetHeight;
	const videoW = video.videoWidth;
	const videoH = video.videoHeight;

	const scaleX = wrapperW / videoW;
	const scaleY = wrapperH / videoH;
	scale = Math.max(scaleX, scaleY); // Cover behavior

	// Center the video in the wrapper
	const videoDisplayW = videoW * scale;
	const videoDisplayH = videoH * scale;
	pos.x = (wrapperW - videoDisplayW) / 2;
	pos.y = (wrapperH - videoDisplayH) / 2;
	
	lastScale = scale;
    }
    
    function getDistance(touches) {
	const dx = touches[0].clientX - touches[1].clientX;
	const dy = touches[0].clientY - touches[1].clientY;
	return Math.sqrt(dx * dx + dy * dy);
    }

    function applyTransform(video) {
	video.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${scale})`;
    }
    
    return {
	apply: apply
    }
})();
