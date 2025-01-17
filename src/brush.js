

let PixelBrush = () => {
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
set_pos: (p, dep) => {
	depth = brush_depth - dep;
	set_path(cursor_path, 1, p, depth);
	c_os = [0, 0];
},
update_pos: (k) => {
	let os = add(smul(2**depth, k), c_os);
	let uos = os.map(v => v | 0);

	cursor_path.set_cur(qtree.color(brush_color));
	cursor_path.add(uos.map(BigInt));

	c_os = sub(os, uos);
	tree_dirty = true;
}
	};

	return obj;
}


let PolyLineBrush = () => {
	/*TODO*/

	let obj = {

	};

	return obj;
}
