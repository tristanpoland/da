
let Pointer = (el, init, ev = init, del = init) => {
	let to_point = (v) => ({
		id: v.pointerId,
		x: v.clientX,
		y: v.clientY,
		force: v.pressure,
		time: v.timeStamp,
		buttons: v.buttons
	});

	el.addEventListener("pointerdown", (e) => init(to_point(e)));
	el.addEventListener("pointermove", (e) => e.getCoalescedEvents().forEach(v => ev(to_point(v))));
	el.addEventListener("pointerup", (e) => del(to_point(e)));
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
	}

	poll = (ev) => {
		if(ev.buttons == 4){
			start = [ev.x, ev.y];
			state = translate;
		}
	}

	state = poll;
	return Pointer(el, (ev) => state(ev));
}


let mouse_wheel = (el, cb) => {
	el.addEventListener("wheel", (e) => cb([e.clientX, e.clientY], 2*Math.atan(e.deltaY)/Math.PI), {passive: true});
}

