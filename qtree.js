
let hash_node = (node) => {
	return Array(4).fill().map((v, i) => node.get_node(i).ind)
		.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
}

let DynUint8 = (sz = 256*4) => {
	let buffer = new Uint8Array(sz); //TODO may fail
	let end = 0;

	let obj = {
get_buffer: () => buffer,
get: (ind) => buffer[ind],
set: (ind, val) => {
	if(ind >= buffer.length){
		let v = 1;
		while(ind >= buffer.length * v) v *= 2;
		let old = buffer;
		buffer = new Uint8Array(buffer.length * v);
		buffer.set(old);
	}

	return buffer[ind] = val;
},
push: (val) => obj.set(end++, val),
get_end: () => end,
clear: () => {
	end = 0;
}
	}

	return obj;
}

let LinearQtree = (buffer = DynUint8()) => {
	let col_memo = new Map(); //??
	let memo = new Map();
	//let buffer = new Uint8Array(256 * 4);

	let obj = {
node_at: (ind) => {
	let node = {
		ind,
		get_node: (i) => obj.node_at(obj.read_uint(ind * 5 + 1 + i)),
		get_tag: () => obj.read_uint(ind * 5),
		set_tag: (t) => obj.write_uint(ind * 5, t),
		set_node: (i, nd) => obj.write_uint(ind * 5 + i + 1, nd.ind),
	};

	return node;
},

write_uint: (ind, num) => {
	ind *= 4;
	buffer.set(ind++, (num >> 0) & 0xff);
	buffer.set(ind++, (num >> 8) & 0xff);
	buffer.set(ind++, (num >> 16) & 0xff);
	buffer.set(ind++, (num >> 24) & 0xff);
},
push_uint: (num) => {
	buffer.push((num >> 0) & 0xff);
	buffer.push((num >> 8) & 0xff);
	buffer.push((num >> 16) & 0xff);
	buffer.push((num >> 24) & 0xff);
},
read_uint: (ind) => {
	let num = 0;
	ind *= 4;
	num += buffer.get(ind++) << 0;
	num += buffer.get(ind++) << 8;
	num += buffer.get(ind++) << 16;
	num += buffer.get(ind++) << 24;
	return num;
},

add_node: (t, ...nodes) => {
	let vals = [t, ...nodes.map(v => v?.ind)];
	let my_ind = buffer.get_end()/20;

	while(vals.length != 5)
		vals.push(my_ind);

	vals.map(obj.push_uint);
	return obj.node_at(my_ind);
},

color: (t) => {
	if(col_memo.has(t))
		return obj.node_at(col_memo.get(t));

	let node = obj.add_node(t);
	col_memo.set(t, node.ind);

	let vals = Array(4).fill(buffer.get_end() / 20);
	let hash = vals.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
	memo.set(hash, node.ind);
	return node;
},

node: (...nodes) => {
	let t = avg_color(nodes.map(v => v.get_tag()));
	let vals = nodes.map(v => v.ind);
	let hash = vals.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
	if(memo.has(hash))
		return obj.node_at(memo.get(hash));

	let node = obj.add_node(t, ...nodes);
	memo.set(hash, node.ind);
	return node;

},

get_buffer: () => buffer,
get_memo: () => memo,
get_size: () => buffer.get_end()/20
	};

	return obj;
}

let log = (fn) => (...x) => (console.log(...x), fn(...x));
let id = (x) => x;

let avg_color = (cols) => {
	let add = (a, b) => a.map((v, i) => v + b[i]);
	return cols.map(v => [
		(v >> 24) & 0xff,
		(v >> 16) & 0xff,
		(v >> 8) & 0xff,
		(v >> 0) & 0xff
	])
		.reduce(add)
		.map(v => (v/cols.length | 0) % 256)
		.reduce((a, b) => a*256 + b, 0);
}

let set_node = (qtree, node, ind, val) => {
	let nodes = Array(4).fill().map((v, i) => node.get_node(i));
	nodes[ind] = val; 
	return qtree.node(...nodes);
}

let replace_node = (qtree, node, [x, y], depth, val) => {
	let stack = [];

	while(depth){
		depth--;
		let ind = !!(x & (1n << depth)) + 2*!!(y & (1n << depth));
		stack.push([node, ind]);
		node = node.get_node(ind); 
	}

	
	if(node == val){
		return stack[0][0];
	}

	while(stack.length){
		let ind;
		[node, ind] = stack.pop();
		val = set_node(qtree, node, ind, val)
	}

	return val;
}

let get_node = (node, [px, py], depth) => {
	/* stack limit bites */
	while(depth != 0){
		depth--;
		let ind = !!(px & (1n << depth)) + 2 * !!(py & (1n << depth));
		node = node.get_node(ind);
	}

	return node;
}




















let GpuUint8 = (rend, name) => {
	let w = gl.getParameter(gl.MAX_TEXTURE_SIZE)/4;
	rend.set_texture_buf(name, new Uint8Array(w*w*4).fill(0));

	/*let buf = DynUint8(w);*/
	let end = 0;
	
	let arr = new Uint8Array(4);
	arr_ind = 0;

	let obj = {
set: (ind, val) => {
	/*if(ind >= end){
		buf.set(ind - end, val);
		return val;
	}*/

	arr[arr_ind++] = val;
	if(arr_ind == 4){
		arr_ind = 0;
		rend.write_buf(name, ind/4 | 0, arr);
	}

	return val;
},
//push: (val) => buf.push(val),
push: (val) => obj.set(end++, val),
clear: () => end = 0,
get_end: () => end
/*
flush: () => {
	rend.write_buf(name, end/4, buf.get_buffer().subarray(0, buf.get_end()));
	end += buf.get_end();
	buf = DynUint8();
},
clear: () => {
	buf.clear();
	arr_ind = end = 0;
},
get_end: () => end + buf.get_end();
*/
	}

	return obj;
}





let QtreeMirror = (q1, q2) => {
	let seen = new Map();

	let obj = {
get_seen: () => seen,
mirror: (node) => {
	if(seen.has(node.ind))
		return q2.node_at(seen.get(node.ind));

	let nd = q2.add_node(node.get_tag());
	seen.set(node.ind, nd.ind);
	return nd;
},
node_at: (ind) => {
	let nd = q1.node_at(ind);
	let mnd = obj.mirror(nd);

	let node = {
		ind: nd.ind,
		get_node: (i) => {
			let n = nd.get_node(i);
			if(!seen.has(n.ind)){
				for(let i = 0; i < 4; i++)
					mnd.set_node(i, obj.mirror(nd.get_node(i)));
			}

			return obj.node_at(n.ind);	
		},
		get_tag: nd.get_tag,
		set_tag: (t) => (mnd.set_tag(t), nd.set_tag(t)),
		set_node: (i, n) => {
			nd.set_node(i, n);
			for(let i = 0; i < 4; i++)
				mnd.set_node(i, obj.mirror(nd.get_node(i)));
		}
	};

	return node;
},
add_node: (t, ...nodes) => {
	let nd = q1.add_node(t, ...nodes);

	let n2 = q2.add_node(t, ...nodes.map(obj.mirror));
	seen.set(nd.ind, n2.ind);

	return obj.node_at(nd.ind);
},
node: (...nodes) => {
	let nd = q1.node(...nodes);

	if(!seen.has(nd.ind)){
		let n2 = q2.add_node(nd.get_tag(), ...nodes.map(obj.mirror));
		seen.set(nd.ind, n2.ind);
	}

	return obj.node_at(nd.ind);
},
color: (t) => {
	let nd = q1.color(t);
	obj.mirror(md);
	return obj.node_at(nd.ind);
}

	};

	return obj;
}


let sub_tree = (node, depth = -1) => {
	//let new_tree = LinearQtree(GpuUint8(rend, "tex"));
	let new_tree = LinearQtree();
	let seen = new Map();

	let sub_tree_ = (node, depth) => {
		if(seen.has(node.ind)){
			let [de, nd] = seen.get(node.ind);
			if(de >= depth)
				return nd;
		}

		let nodes = Array(4).fill().map((v, i) => node.get_node(i));
		if(depth == 0 || nodes.every(v => v.ind == node.ind))
			return new_tree.color(node.get_tag());

		let new_nd = new_tree.add_node(node.get_tag(), ...nodes.map(v => sub_tree_(v, depth-1)));

		seen.set(node.ind, [depth, new_nd]);
		return new_nd;
	}

	let ret = [new_tree, sub_tree_(node, depth)];
	//new_tree.get_buffer().flush();

	return ret;
}












let QtreePath = (qtree, node) => {
	let path = [[node, null]];

	let obj = {
cur: () => path.at(-1)[0],
set_cur: (val) => path.at(-1)[0] = val,
cur_ind: () => path.at(-1)[1],
desc: (ind) => path.push([obj.cur().get_node(ind), ind]),
asc: (hint = 0) => {
	let [n1, ind] = path.pop();
	if(path.length == 0){
		path.push([qtree.color(0xffffffff), null]);
		ind = hint;
	}

	obj.set_cur(set_node(qtree, obj.cur(), ind, n1));
	return [n1, ind];
},
set_path: ([px, py], depth) => {
	/* stack limit bites */
	path = [[obj.get_root(), null]];
	while(depth != 0){
		depth--;
		let ind = !!(px & (1n << depth)) + 2*!!(py & (1n << depth));
		obj.desc(ind);
	}

	return obj.cur();
},
add: ([x, y]) => {
	let stack = [];

	while(x || y){
		let [node, ind] = obj.asc((x < 0) + 2*(y < 0));

		let os = !!(x & 1n) + 2*!!(y & 1n);
		stack.push(ind ^ os);

		x >>= 1n;
		y >>= 1n;

		x += BigInt(!!(os & ind & 1));
		y += BigInt(!!(os & ind & 2));
	}

	while(stack.length)
		obj.desc(stack.pop());

	return obj.cur();
},
get_root: () => {
	if(path == null || path.length == 0)
		return null;
	for(let i = path.length-1; i--;)
		path[i][0] = set_node(qtree, path[i][0], path[i+1][1], path[i+1][0]);

	return path[0][0];
},
get_tree: () => qtree
	}

	return obj;
}
