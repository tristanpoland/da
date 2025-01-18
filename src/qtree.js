
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
pop: (val) => obj.get(--end),
get_end: () => end,
set_end: (ind) => end = ind,
clear: () => end = 0,
	}

	return obj;
}


let Uint32Arr = (u8buf) => {
	let obj = {
get_buffer: () => u8buf,
set: (ind, num) => {
	ind *= 4;
	u8buf.set(ind++, (num >> 0) & 0xff);
	u8buf.set(ind++, (num >> 8) & 0xff);
	u8buf.set(ind++, (num >> 16) & 0xff);
	u8buf.set(ind++, (num >> 24) & 0xff);
},
push: (num) => {
	u8buf.push((num >> 0) & 0xff);
	u8buf.push((num >> 8) & 0xff);
	u8buf.push((num >> 16) & 0xff);
	u8buf.push((num >> 24) & 0xff);
},
get: (ind) => {
	let num = 0;
	ind *= 4;
	num += u8buf.get(ind++) << 0;
	num += u8buf.get(ind++) << 8;
	num += u8buf.get(ind++) << 16;
	num += u8buf.get(ind++) << 24;
	return num;
},
pop: () => {
	let ret = obj.get(obj.get_end()-1)
	obj.set_end(obj.get_end()-1);
	return ret;
},
get_end: () => u8buf.get_end() / 4,
set_end: (ind) => u8buf.set_end(ind * 4),
clear: () => u8buf.clear()
	};

	return obj;
}


let LinearQtree = (buffer = Uint32Arr(DynUint8())) => {
	let ab, col_ab, memo, col_memo;
	//let col_memo = new Map(); //??
	//let memo = new Map();
	//let buffer = new Uint8Array(256 * 4);

	let obj = {
node_at: (ind) => {
	let node = {
		ind,
		get_node: (i) => obj.node_at(buffer.get(ind * 5 + 1 + i)),
		get_tag: () => buffer.get(ind * 5),
		set_tag: (t) => buffer.set(ind * 5, t),
		set_node: (i, nd) => buffer.set(ind * 5 + i + 1, nd.ind),
	};

	return node;
},

add_node: (t, ...nodes) => {
	let vals = [t, ...nodes.map(v => v?.ind)];
	let my_ind = buffer.get_end()/5;

	while(vals.length != 5)
		vals.push(my_ind);

	vals.map(buffer.push);
	return obj.node_at(my_ind);
},

color: (t) => {
	let node = obj.add_node(t);

	let free = false;
	col_memo = col_ab.insert(col_memo, node.ind, (ind) => {
		buffer.set_end(buffer.get_end() - 5);
		free = true;
		node = obj.node_at(ind);
	});

	memo = ab.insert(memo, node.ind, (ind) => {
		if(!free)
			buffer.set_end(buffer.get_end() - 5);
		node = obj.node_at(ind);
	});

	return node;
},
node: (...nodes) => {
	let t = avg_color(nodes.map(v => v.get_tag()));
	let node = obj.add_node(t, ...nodes);

	memo = ab.insert(memo, node.ind, (ind) => {
		buffer.set_end(buffer.get_end() - 5);
		node = obj.node_at(ind);
	});


	return node;
},

get_buffer: () => buffer,
get_memo: () => [ab, col_ab, memo, col_memo],
get_size: () => buffer.get_end()/5
	};

	let node_to_uint = (node) => {
		return Array(4).fill().map((v, i) => node.get_node(i).ind)
			.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
	}

	ab = _24_tree(Uint32Arr(DynUint8()), 
		(a, b) => node_to_uint(obj.node_at(a)) < node_to_uint(obj.node_at(b)),
		(a, b) => node_to_uint(obj.node_at(a)) == node_to_uint(obj.node_at(b))
	);

	col_ab = _24_tree(Uint32Arr(DynUint8()), 
		(a, b) => obj.node_at(a).get_tag() < obj.node_at(b).get_tag(),
		(a, b) => obj.node_at(a).get_tag() == obj.node_at(b).get_tag()
	);
	memo = ab.node_at(0);
	col_memo = col_ab.node_at(0);


	return obj;
}











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

let render_sdf = (qtree, node, depth, sdf, fill) => {
	let render_ = (node, orig, unit, depth) => {
		unit = unit/2;

		let dist = sdf(orig);
		let target = 2**0.5 * unit;

		if(dist < -target || depth <= 0)
			return fill;

		if(dist < target){
			let nodes = Array(4).fill().map((v, i) => node.get_node(i));
			return qtree.node(
				...nodes
					.map((v, i) => render_(v, add(smul(unit, [!!(i & 1) - 0.5, 0.5 - !!(i & 2)]), orig), unit, depth-1))
			);
		}

		return node;
	};

	return render_(node, [0, 0], 1, depth);
}

//slower
let render_sdf_fn = (qtree, node, depth, sdf, color) => {
	let render_ = (node, orig, unit, depth) => {
		unit = unit/2;

		let dist = sdf(orig);
		let target = 2**0.5 * unit;
	
		if(depth <= 0)
			return color(orig, node);

		if(dist < target){
			let nodes = Array(4).fill().map((v, i) => node.get_node(i));
			return qtree.node(
				...nodes
					.map((v, i) => render_(v, add(smul(unit, [!!(i & 1) - 0.5, 0.5 - !!(i & 2)]), orig), unit, depth-1))
			);
		}

		return node;
	};

	return render_(node, [0, 0], 1, depth);
}


















//TODO make this less fucky
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
full_mirror: (node) => {
	let nodes = Array(4).fill().map((v, i) => node.get_node(i));
	let mnd = obj.mirror(node);

	nodes.forEach((v, i) => {
		if(!seen.has(v.ind))
			mnd.set_node(i, obj.full_mirror(v));
		else
			mnd.set_node(i, obj.mirror(v));
	});

	return mnd;
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
			}else{
				mnd.set_node(i, obj.mirror(n));
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
	obj.full_mirror(nd)
	return obj.node_at(nd.ind);
},
color: (t) => {
	let nd = q1.color(t);
	obj.mirror(nd);
	return obj.node_at(nd.ind);
}

	};

	return obj;
}













let QtreePath = (qtree, node) => {
	let path = [[node, null]];

	let obj = {
copy: () => {
	let cp = QtreePath(qtree, obj.get_root());

	for(let i = 1; i < path.length; i++)
		cp.desc(path[i][1]);

	return cp;
},
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

let set_path = (path, unit, p, depth) => {
	let orig = [0, 0];

	path.set_path([0n, 0n], 0n);

	for(let i = 0; i < depth; i++){
		let quad = [p[0] > orig[0], p[1] < orig[1]];

		path.desc(quad[0] + 2*quad[1]);

		unit /= 2;
		orig = add(smul(unit, [quad[0]-0.5, 0.5-quad[1]]), orig);
	}

	return path;
}


























let index_heap = (buffer, is_lt) => {
	let obj = {
get_buffer: () => buffer,
insert: (ind) => {
	let buf_pos = buffer.get_end();
	buffer.push(ind);
	obj.sift_down(buf_pos);
},
extract_min: () => {
	let ret = buffer.get(0);
	buffer.set(0, buffer.pop());
	obj.sift_up(0);
	return ret;
},
cas: (a, b) => {
	let a_val = buffer.get(a);
	let b_val = buffer.get(b);

	if(is_lt(a_val, b_val))
		return false;

	buffer.set(b, a_val);
	buffer.set(a, b_val);
	return true;
},
sift_up: (ind) => {
	let l_ind = (ind + 1) * 2 - 1
	let r_ind = l_ind + 1;

	if(l_ind >= buffer.get_end())
		return;

	let take = l_ind;
	if(r_ind < buffer.get_end()){
		if(is_lt(buffer.get(r_ind), buffer.get(l_ind)))
			take = r_ind;
	}

	if(obj.cas(ind, take))
		obj.sift_up(take);
},
sift_down: (ind) => {
	if(ind == 0)
		return;

	let p_ind = ((ind + 1) / 2 | 0) - 1;

	if(obj.cas(p_ind, ind))
		obj.sift_down(p_ind);
},
is_empty: () => buffer.get_end() == 0
	};

	return obj;
} 




let Arena = (buffer, alloc_size) => {
	let heap = index_heap(DynUint8());

	let obj = {
alloc: () => {
	if(heap.is_empty()){
		let ind = buffer.get_end();
		buffer.set_end(buffer.get_end() + alloc_size);
		return ind;
	}

	let ind = heap.extract_min();
	return ind;
},
free: (ind) => heap.insert(ind)
	};

	return obj;
}






let _24_tree = (buffer, is_lt, is_eq) => {
	let arena = Arena(buffer.get_buffer(), 8 * 4);

	let obj = {
node_at: (ind) => {
	let node = {
		ind,
		size: () => buffer.get(ind),
		get_size: () => buffer.get(ind),
		set_size: (val) => buffer.set(ind, val),
		get_key: (i) => buffer.get(ind + 1 + i),
		set_key: (i, key) => buffer.set(ind + 1 + i, key),
		get_node: (i) => obj.node_at(buffer.get(ind + 4 + i)),
		set_node: (i, node) => buffer.set(ind + 4 + i, node.ind),
	};

	return node;
},
add_node: (keys, nodes) => {
	let node = obj.node_at(arena.alloc());
	node.set_size(Math.max(keys.length + 1, nodes.length));
	keys.forEach((v, i) => node.set_key(i, v));
	nodes.forEach((v, i) => node.set_node(i, v));
	return node;
},
search: (node, key) => {
	if(node.ind == 0)
		return null;

	let i = 0;
	for(; i < node.get_size() - 1; i++){
		let cur_key = node.get_key(i);
		if(is_eq(key, cur_key))
			return cur_key;

		if(is_lt(key, cur_key))
			break;
	}

	return obj.search(node.get_node(i), key);
},
node_split: (keys, nodes, ind) => {
	let l_keys = keys.slice(0, ind);
	let m_key = keys[ind];
	let r_keys = keys.slice(ind+1);

	let l_nodes = nodes.slice(0, ind+1);
	let r_nodes = nodes.slice(ind+1);

	return [
		m_key,
		obj.add_node(l_keys, l_nodes), 
		obj.add_node(r_keys, r_nodes)
	];
},
node_insert: (node, ind, key, repl) => {
	let keys = Array(node.get_size() - 1).fill().map((v, i) => node.get_key(i));
	let nodes = Array(node.get_size()).fill().map((v, i) => node.get_node(i));

	let new_keys = [...keys.slice(0, ind), key, ...keys.slice(ind)];
	let new_nodes = [...nodes.slice(0, ind), ...repl, ...nodes.slice(ind + 1)];

	if(new_keys.length > 3)
		return obj.node_split(new_keys, new_nodes, 2);

	new_keys.forEach((v, i) => node.set_key(i, v)); //kinda gross, but constant cost...
	new_nodes.forEach((v, i) => node.set_node(i, v));
	node.set_size(new_nodes.length);	

	return [node];
},
insert_: (node, key, fn) => {
	if(node.ind == 0)
		return [key, obj.node_at(0), obj.node_at(0)];

	let i = 0;
	for(; i < node.get_size() - 1; i++){
		let cur_key = node.get_key(i);
		if(is_eq(key, cur_key)){
			fn(cur_key);
			return [node];
		}

		if(is_lt(key, cur_key))
			break;
	}

	let next_node = i;
	let next = obj.insert_(node.get_node(next_node), key, fn);
	if(next.length == 1){
		node.set_node(next_node, next[0]);
		return [node];
	}

	return obj.node_insert(node, next_node, next[0], [next[1], next[2]]);
},
insert: (node, key, fn = () => null) => {
	let next = obj.insert_(node, key, fn);
	if(next.length == 1)
		return next[0];
	return obj.add_node([next[0]], [next[1], next[2]]);
},
to_json: (node) => {
	if(node.ind == 0)
		return {};

	let keys = Array(node.get_size() - 1).fill().map((v, i) => node.get_key(i));
	let nodes = Array(node.get_size()).fill().map((v, i) => node.get_node(i)).map(obj.to_json);

	return {keys, nodes};
}
	};

	root = obj.node_at(arena.alloc());

	return obj;
};










