const Layout = (function() {
    
    let grid;

    const layouts = {
	1: {
	    columns: '1fr',
	    rows: '1fr',
	},
	2: {
	    columns: '1fr 1fr',
	    rows: '1fr',
	},
	3: {
	    columns: '1fr 1fr 1fr',
	    rows: '1fr',
	},
	4: {
	    columns: '1fr 1fr',
	    rows: '1fr 1fr',
	}
    };

    function init(gridId) {
	grid = document.getElementById(gridId);
	window.addEventListener('DOMContentLoaded', update);
	window.addEventListener('resize', update);
    }
    
    function update() {
	const count = grid.children.length;

	// Reset
	grid.style.gridTemplateColumns = '';
	grid.style.gridTemplateRows = '';
	
	// Update
	const layout = layouts[Math.min(count, 4)];
	if(!layout) return;
	
	grid.style.gridTemplateColumns = layout.columns;
	grid.style.gridTemplateRows = layout.rows;
    }

    function add(el) {
	if(grid.children.length >= 4) return null; // max 4 elements
	grid.appendChild(el);
	update();
    }

    function remove(el) {
	if(!el) return;
        el.remove();
	update();
    }
    
    return {
	init: init,
	add: add,
	remove: remove
    }
})();
