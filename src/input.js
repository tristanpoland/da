
let Pointer = (el, init, ev = init, del = init) => {
	let to_point = (v) => ({
		id: v.pointerId,
		x: v.offsetX,
		y: v.offsetY,
		force: v.pressure,
		time: v.timeStamp,
		buttons: v.buttons
	});

	el.addEventListener("pointerdown", (e) => init(to_point(e)));
	el.addEventListener("pointermove", (e) => {
		e.getCoalescedEvents /* only works in https */
			? e.getCoalescedEvents().forEach(v => ev(to_point(v)))
			: ev(to_point(e))
	});
	el.addEventListener("pointerup", (e) => del(to_point(e)));
	el.addEventListener("pointerleave", (e) => del(to_point(e)));
	el.addEventListener("pointerout", (e) => del(to_point(e)));
}

let Keyboard = (el, down, up) => {
	el.addEventListener("keydown", (e) => down(e.keyCode));
	el.addEventListener("keyup", (e) => up(e.keyCode));
}



let mouse_pan = (el, get_pos, set_pos) => {
	let start;
	let state, translate, poll;

	translate = (ev) => {
		let pos = get_pos();
		set_pos([pos[0] + ev.x - start[0], pos[1] + start[1] - ev.y]);
		start = [ev.x, ev.y];

		if(ev.buttons != 4){
			state = poll;
		}
	};

	poll = (ev) => {
		if(ev.buttons == 4){
			start = [ev.x, ev.y];
			state = translate;
		}
	};

	state = poll;
	return Pointer(el, (ev) => state(ev));
}


let mouse_wheel = (el, cb) => {
	el.addEventListener("wheel", (e) => cb([e.clientX, e.clientY], 2*Math.atan(e.deltaY)/Math.PI), {passive: true});
}








let touch_pan = (el, get_pos, set_pos) => {
	let pointers = {};
	let start;
	let state, translate, poll;

	let get_points = () => Object.entries(pointers).map(v => v[1]);
	let get_avg_pos = () => ((points) => points.reduce((a, b) => [a[0] + b[0], a[1] + b[1]]).map(v => v / points.length))
		(get_points());

	translate = (ev) => {
		pointers[ev.id] = [ev.x, ev.y];

		let pos = get_pos();
		let avg_pos = get_avg_pos();
		set_pos([pos[0] + avg_pos[0] - start[0], pos[1] + start[1] - avg_pos[1]]);
		start = avg_pos;

	};

	poll = (ev) => {};

	let add_pointer = (ev) => {
		pointers[ev.id] = [ev.x, ev.y];

		if(Object.keys(pointers).length == 2){
			start = get_avg_pos();
			state = translate;
		}else{
			state = poll;
		}
	};

	let del_pointer = (ev) => {
		delete pointers[ev.id];

		if(Object.keys(pointers).length != 2)
			state = poll;
	};

	state = poll;
	return Pointer(el, add_pointer, (ev) => state(ev), del_pointer);
}

let touch_pinch = (el, cb) => { //TODO figure out how to fix paning while pinching :/
	let pointers = {};
	let start;
	let state, translate, poll;

	let get_points = () => Object.entries(pointers).map(v => v[1]);
	let get_avg_pos = () => ((points) => points.reduce((a, b) => [a[0] + b[0], a[1] + b[1]]).map(v => v / points.length))
		(get_points());
	let dist = (a, b) => {
		let v = [a[0] - b[0], a[1] - b[1]];
		return (v[0]*v[0] + v[1]*v[1])**0.5;
	}

	translate = (ev) => {
		pointers[ev.id] = [ev.x, ev.y];

		let n_dist = dist(...get_points());
		
		let pinch = Math.sign((start - n_dist)/10 | 0); //TODO dynamically find value

		if(pinch){
			cb(get_avg_pos(), Math.sign(pinch | 0))
			start = n_dist;
		}

	};

	poll = (ev) => {};

	let add_pointer = (ev) => {
		pointers[ev.id] = [ev.x, ev.y];

		if(Object.keys(pointers).length == 2){
			start = dist(...get_points());
			state = translate;
		}else{
			state = poll;
		}
	};

	let del_pointer = (ev) => {
		delete pointers[ev.id];

		if(Object.keys(pointers).length != 2)
			state = poll;
	};

	state = poll;
	return Pointer(el, add_pointer, (ev) => state(ev), del_pointer);
}




let pointer_drag = (el, st, cb) => {
	let start;
	let state, drag, poll;
	let pointers = {};

	drag = (ev) => {
		if(length(sub(start, [ev.x, ev.y])) > 2){
			cb([ev.x, ev.y], [ev.x - start[0], ev.y - start[1]]);
			start = [ev.x, ev.y];
		}
	};

	poll = (ev) => {};

	let add_pointer = (ev) => {
		pointers[ev.id] = [ev.x, ev.y];

		if(Object.keys(pointers).length == 1 && ev.buttons == 1){
			start = pointers[ev.id];
			st(start);
			state = drag;
		}else{
			state = poll;
		}
	};

	let del_pointer = (ev) => {
		delete pointers[ev.id];

		if(Object.keys(pointers).length != 1)
			state = poll;
	};


	state = poll;
	return Pointer(el, add_pointer, (ev) => state(ev), del_pointer);
}



