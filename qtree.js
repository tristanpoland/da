let LinearQtree = () => {
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
		hash: () => Array(5).fill().map((v, i) => obj.read_uint(ind*5 + i)).reduce((a, b) => (a << 32n) + BigInt(b), 0n)
	};

	return node;
},

forEach: (fn) => {
	for(let i = 0; i*5 < data_end; i++)
		fn(obj.node_at(i), i);
},

write_uint: (ind, num) => {
	ind *= 4;
	buffer[ind++] = num & 0xff;
	num >>= 8;
	buffer[ind++] = num & 0xff;
	num >>= 8;
	buffer[ind++] = num & 0xff;
	num >>= 8;
	buffer[ind++] = num & 0xff;
	num >>= 8;
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

add_node: (t, a, b, c, d) => {
	if(buffer.length - data_end < 5 * 4)
		buffer = new Uint8Array([...buffer, ...Array(buffer.length).fill(0)]);

	let my_ind = data_end/20;
	let vals = [t, a?.ind ?? my_ind, b?.ind ?? my_ind, c?.ind ?? my_ind, d?.ind ?? my_ind];

	let ind = data_end / 4;
	vals.map((v, i) => obj.write_uint(ind + i, v));
	data_end += 20;

	return obj.node_at(my_ind);
},

get_buffer: () => buffer,
get_memo: () => memo
	};

	return obj;
}


let replace_node = (qtree, node, [x, y], depth, val) => {
	if(depth == 0n)
		return val;

	depth--;
	let ind = !!(x & (1n << depth)) + 2*!!(y & (1n << depth));
	let nodes = Array(4).fill().map((v, i) => node.get_node(i));

	nodes[ind] = replace_node(qtree, nodes[ind], [x, y], depth, val)
	return qtree.add_node(node.get_tag(), ...nodes);
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

	let ind = 0;
	let seen = new Map();

	let sub_tree_ = (node, depth) => {
		if(seen.has(node.hash()))
			return seen.get(node.hash());

		let new_node = new_tree.add_node(node.get_tag());
		seen.set(node.hash(), new_node);

		if(depth == 0)
			return new_node;

		let nodes = Array(4).fill().map((v, i) => node.get_node(i));

		nodes.map((v, i) => 
			new_node.set_node(i, sub_tree_(v, depth - 1)));

		return new_node;
	}

	sub_tree_(node, depth);
	return new_tree;
}

