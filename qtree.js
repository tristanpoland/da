let LinearQtree = () => {
	let col_memo = new Map(); //??
	let memo = new Map();
	let buffer = new Uint8Array(256 * 4);
	let data_end = 0;

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

forEach: (fn) => {
	for(let i = 0; i*5 < data_end; i++)
		fn(obj.node_at(i), i);
},

write_uint: (ind, num) => {
	ind *= 4;
	buffer[ind++] = (num >> 0) & 0xff;
	buffer[ind++] = (num >> 8) & 0xff;
	buffer[ind++] = (num >> 16) & 0xff;
	buffer[ind++] = (num >> 24) & 0xff;
},

read_uint: (ind) => {
	let num = 0;
	ind *= 4;
	num += buffer[ind++] << 0;
	num += buffer[ind++] << 8;
	num += buffer[ind++] << 16;
	num += buffer[ind++] << 24;
	return num;
},

add_node: (t, ...nodes) => {
	if(buffer.length - data_end < 5 * 4)
		buffer = new Uint8Array([...buffer, ...Array(buffer.length).fill(0)]);

	let vals = [t, ...nodes.map(v => v?.ind)];
	let my_ind = data_end/20;

	let ind = data_end / 4;
	vals.map((v, i) => obj.write_uint(ind + i, v));
	data_end += 20;

	return obj.node_at(my_ind);
},

color: (t) => {
	if(col_memo.has(t))
		return obj.node_at(col_memo.get(t));

	let node = obj.add_node(t);
	col_memo.set(t, node.ind);

	for(let i = 0; i < 4; i++)
		node.set_node(i, node);

	memo.set(hash_node(node), node.ind);
	return node;
},

node: (...nodes) => {
	let vals = nodes.map(v => v.ind);
	let hash = vals.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
	if(memo.has(hash))
		return obj.node_at(memo.get(hash));

	let t = avg_color(nodes.map(v => v.get_tag()));
	let node = obj.add_node(t, ...nodes);
	memo.set(hash, node.ind);
	return node;
},

get_buffer: () => buffer,
get_memo: () => memo
	};

	return obj;
}

let hash_node = (node) => {
	return Array(4).fill().map((v, i) => node.get_node(i).ind)
		.reduce((a, b) => (a << 32n) + BigInt(b), 0n);
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

let replace_node = (qtree, node, [x, y], depth, val) => {
	let stack = [];

	while(depth){
		depth--;
		let ind = !!(x & (1n << depth)) + 2*!!(y & (1n << depth));
		stack.push([node, ind]);
		node = node.get_node(ind); 
	}

	while(stack.length){
		let ind;
		[node, ind] = stack.pop();
		let nodes = Array(4).fill().map((v, i) => node.get_node(i));
		nodes[ind] = val; 
		val = qtree.node(...nodes);
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

let sub_tree = (node, depth = -1) => {
	let new_tree = LinearQtree();

	let sub_tree_ = (node, depth) => {
		let nodes = Array(4).fill().map((v, i) => node.get_node(i));
		if(depth == 0 || nodes.every(v => v.ind == node.ind))
			return new_tree.color(node.get_tag());

		return new_tree.node(...nodes.map(v => sub_tree_(v, depth-1)));
	}

	return [new_tree, sub_tree_(node, depth)];
}

