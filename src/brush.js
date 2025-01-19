

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


let line_sdf = (p, a, b) => {
	let pa = sub(p, a), ba = sub(b, a);

	if(ba.every(v => v == 0))
		return length(pa);

	let h = clamp(dot(pa, ba)/dot(ba,ba), 0.0, 1.0);
	return length(add(pa, smul(-h, ba)));
};

let SdfBrush = (rel, sdf = (p1, p2, width) => (p) => line_sdf(p, p1, p2) - width) => {
	let c_pos = [0, 0];
	let qtree;
	let node;

	let brush_color = 0xff000000;
	let brush_depth = 10;
	let brush_width = 0.001;
	let tree_dirty = false;

	let depth;
	let zoom;

	let obj = {
get_tree: () => qtree,
set_color: (col) => brush_color = col,
set_scale: (val) => brush_depth = val,
set_width: (val) => brush_width = val,
get_surface: () => [qtree, node],
dirty: () => tree_dirty, //TODO find a better way?
clean: () => tree_dirty = false,
set_surface: (qt, nd) => {
	qtree = qt;
	node = nd;
},
set_pos: (p, dep, zm) => {
	depth = dep;
	zoom = zm
	c_pos = p;
},
update_pos: (p, k) => {
	node = render_sdf(
		qtree,
		node,
		rel ? brush_depth : brush_depth-depth, 
		sdf(p, c_pos, rel ? brush_width * zoom : brush_width * 2**depth),
		qtree.color(brush_color)
	);

	c_pos = p;
	tree_dirty = true;
}
	};

	return obj;
}
