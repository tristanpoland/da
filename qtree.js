
let LinearQtree = () => {
	let buffer = new Uint8Array(256 * 4);
	let data_end = 0;

	let obj = {
node_at: (ind) => {
	let node = {
		ind,
		get_node: (i) => obj.node_at(obj.read_uint(ind * 5 + 1 + i)),
		get_tag: () => obj.read_uint(ind * 5),
		set_tag: (t) => obj.write_uint(ind * 5, t),
		set_node: (i, nd) => obj.write_uint(ind * 5 + i + 1, nd.ind)
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
	if(buffer.length - data_end < 5 * 4){
		buffer = new Uint8Array([...buffer, ...Array(buffer.length).fill(0)]);
		console.log(buffer.length);
	}

	let ind = data_end / 4;
	obj.write_uint(ind++, t);
	obj.write_uint(ind++, a?.ind ?? 0);
	obj.write_uint(ind++, b?.ind ?? 0);
	obj.write_uint(ind++, c?.ind ?? 0);
	obj.write_uint(ind++, d?.ind ?? 0);

	data_end += 20;

	return obj.node_at((data_end/4 - 5)/5);
},

get_buffer: () => buffer,
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
	if(depth == 0)
		return node;

	depth--;
	let ind = !!(px & (1n << depth)) + 2 * !!(py & (1n << depth));
	return get_node(node.get_node(ind), [px, py], depth);
}
