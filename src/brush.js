

let PixelBrush = (rel) => {
	let brush_color = 0xff000000;
	let c_os = [0, 0];
	let cursor_path;
	let brush_depth = 10;
	let tree_dirty = false;
	let depth;

	let obj = {
get_tree: () => cursor_path.get_tree(),
set_color: (col) => brush_color = col,
set_scale: (val) => brush_depth = val,
get_surface: () => [cursor_path.get_tree(), cursor_path.get_root()],
dirty: () => tree_dirty, //TODO find a better way?
clean: () => tree_dirty = false,
set_surface: (qtree, node) => cursor_path = QtreePath(qtree, node),
set_pos: (p, dep, zm) => {
	depth = dep;
	set_path(cursor_path, 1, p, rel ? brush_depth : brush_depth-depth);
	c_os = [0, 0];
},
update_pos: (p, k) => {
	let os = add(smul(rel ? 2**brush_depth : 2**(brush_depth-depth), k), c_os);
	let uos = os.map(v => v | 0);

	cursor_path.set_cur(qtree.color(brush_color));
	cursor_path.add(uos.map(BigInt));

	c_os = sub(os, uos);
	tree_dirty = true;
}
	};

	return obj;
}


let log = (fn) => (...x) => (console.log(...x), fn(...x));
let line_sdf = (p, a, b) => {
	let pa = sub(p, a), ba = sub(b, a);

	if(ba.every(v => v == 0))
		return length(pa);

	let h = clamp(dot(pa, ba)/dot(ba,ba), 0.0, 1.0);
	return length(add(pa, smul(-h, ba)));
};

let SdfBrush = (rel = false, sdf = (p1, p2, width) => (p) => line_sdf(p, p1, p2) - width) => {
	let c_os = [0, 0];
	let c_pos = [0, 0];

	let brush_color = 0xff000000;
	let brush_depth = 10;
	let brush_width = 0.001;
	let tree_dirty = false;

	let depth;
	let zoom;
	let path;

	let obj = {
get_tree: () => path.get_tree(),
set_color: (col) => brush_color = col,
set_scale: (val) => brush_depth = val,
set_width: (val) => brush_width = val,
get_surface: () => [path.get_tree(), path.get_root()],
dirty: () => tree_dirty, //TODO find a better way?
clean: () => tree_dirty = false,
set_surface: (qt, nd) => {
	path = QtreePath(qt, nd);
},
set_pos: (p, dep, zm) => {
	depth = dep;
	zoom = zm;
	c_pos = p;
	c_os = [0, 0];
	set_path(path, 1, p, rel ? brush_depth : brush_depth - depth);
},
update_pos: (p, k) => {
	let disp_width = rel ? brush_width * zoom : brush_width;
	let max_length = disp_width*4 + length(k);

	let os = add(smul(rel ? 2**brush_depth : 2**(brush_depth-depth), k), c_os);
	let uos = os.map(v => v | 0);

	//breaks when depth_bound <= 2
	let depth_bound = (-Math.log2(max_length) | 0);


	let ps = [c_os, os];


	let stack = [];
	let de = rel ? brush_depth : brush_depth-depth;
	if(depth_bound > 2){
		while(path.get_depth() >= depth_bound){
			let ind = path.cur_ind();
			ps = ps.map(v => smul(0.5, add(v, [!!(ind&1), !!(ind&2)])));
			stack.push(ind);
			path.asc();
		}


		de -= path.get_depth();
		let width = disp_width * 2**(brush_depth-de);
		let in_range = (a, b, v) => v > a && v < b;

		let quad = [
			ps[0][0] < 4*width, 
			ps[0][1] < 4*width
		].map(v => BigInt(v));

		ps = ps.map(v => smul(0.5, sub(v, quad.map(v => !v))));
		
		path.add(smul(-1n, quad));

		set_tlnode(path, render_sdf(
			path.get_tree(),
			get_tlnode(path),
			de,
			sdf(...ps, width),
			qtree.color(brush_color)
		));

		path.add(quad);

	}else{
		path.get_root();
		while(path.get_depth()){
			stack.push(path.cur_ind());
			path.asc();
		}

		path.set_cur(render_sdf(
			path.get_tree(),
			path.get_root(),
			de,
			sdf(c_pos, p, rel ? brush_width * zoom : brush_width * 2**depth),
			qtree.color(brush_color)
		));
	}

	while(stack.length)
		path.desc(stack.pop());

	c_os = sub(os, uos);
	c_pos = p;
	path.add(uos.map(BigInt));
	tree_dirty = true;
}
	};

	return obj;
}





let EyeDropper = (cb) => {
	let c_os = [0, 0];
	let cursor_path;
	let brush_depth = 10;
	let tree_dirty = false;
	let depth;

	let obj = {
get_tree: () => cursor_path.get_tree(),
set_color: (col) => brush_color = col,
set_scale: (val) => brush_depth = val,
get_surface: () => [cursor_path.get_tree(), cursor_path.get_root()],
dirty: () => tree_dirty, //TODO find a better way?
clean: () => tree_dirty = false,
set_surface: (qtree, node) => cursor_path = QtreePath(qtree, node),
set_pos: (p, dep, zm) => {
	depth = dep;
	set_path(cursor_path, 1, p, brush_depth);
	c_os = [0, 0];
},
update_pos: (p, k) => {
	let os = add(smul(2**brush_depth, k), c_os);
	let uos = os.map(v => v | 0);

	cb(cursor_path.cur());
	cursor_path.add(uos.map(BigInt));

	c_os = sub(os, uos);
	tree_dirty = true;
}
	};

	return obj;
}


let fill = (path, c1, color) => {
	let stack = [];

	while(path.get_depth() > 0){
		stack.push(path.cur_ind());
		path.asc();

		if(path.cur().ind != c1.ind){
			path.desc(stack.pop());
			break;
		}
	}

	path.set_cur(color);

	let queue = [[0n, 1n, 0n], [1n, 0n, 0n], [-1n, 0n, 0n], [0n, -1n]];

	let pos = [0n, 0n];
	while(queue.length){
		let cur = queue.pop();

	}
}

let BucketFill = () => {
	let cursor_path;
	let brush_color;
	let brush_depth = 10;
	let tree_dirty = false;
	let depth;

	let obj = {
get_tree: () => cursor_path.get_tree(),
set_color: (col) => brush_color = col,
set_scale: (val) => brush_depth = val,
get_surface: () => [cursor_path.get_tree(), cursor_path.get_root()],
dirty: () => tree_dirty, //TODO find a better way?
clean: () => tree_dirty = false,
set_surface: (qtree, node) => cursor_path = QtreePath(qtree, node),
set_pos: (p, dep, zm) => {
	depth = dep;
},
update_pos: (p, k) => {
	set_path(cursor_path, 1, p, brush_depth);
	fill(cursor_path, cursor_path.cur(), cursor_path.get_tree().color(brush_color));

	tree_dirty = true;
}
	};

	return obj;
}


