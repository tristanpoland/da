
let gl_load_shader = (gl, type, source) => {
	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

let gl_init_shader = (gl, vsource, fsource) => {
	let vertex_shader = gl_load_shader(gl, gl.VERTEX_SHADER, vsource);
	let fragment_shader = gl_load_shader(gl, gl.FRAGMENT_SHADER, fsource);

	let shader_program = gl.createProgram();
	gl.attachShader(shader_program, vertex_shader);
	gl.attachShader(shader_program, fragment_shader);
	gl.linkProgram(shader_program);

	if(!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
		console.log(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader_program;
}

let FragmentRenderer = (gl, fsource) => {
	let shader_program = gl_init_shader(gl,
`
precision highp float;
attribute vec2 aVertexPosition;

void main(){
	gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`, fsource);


	let pos_buf = gl.createBuffer();
	let texture = {};
	let uniform = {};
	let textures = 0;
	let tex_bufs = [];

	let active_texture;

	let positions = [1, 1, -1, 1, 1, -1, -1, -1];

	let obj = {
set_active: () => {
	gl.useProgram(shader_program);
	gl.bindBuffer(gl.ARRAY_BUFFER, pos_buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, pos_buf);

	let vert_pos = gl.getAttribLocation(shader_program, "aVertexPosition");
	gl.vertexAttribPointer(
		vert_pos,
		2,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.enableVertexAttribArray(vert_pos);

	active_texture = null;
},
draw: () => {
	tex_bufs.forEach(v => v.flush());
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
},
set_uniform: (name, type, value) => {
	uniform[name] ??= gl.getUniformLocation(shader_program, name);

	let type_lut = {
		"float": (loc, x) => gl.uniform1f(loc, x),
		"vec2": (loc, v) => gl.uniform2f(loc, ...v),
		"vec3": (loc, v) => gl.uniform3f(loc, ...v),
		"vec4": (loc, v) => gl.uniform4f(loc, ...v),
		"ivec4": (loc, v) => gl.uniform4i(loc, ...v),
		"mat4": (loc, v) => gl.uniformMatrix4fv(loc, false, v),
		"int": (loc, x) => gl.uniform1i(loc, x)
	};

	type_lut[type](uniform[name], value);
},
set_texture: (name, w, h, arr) => {
	let tex = texture[name] ?? (texture[name] = {
		ind: ++textures,
		buf: gl.createTexture()
	});

	tex.res = [w, h];

	let loc = gl.getUniformLocation(shader_program, name)

	obj.set_uniform(name, "int", tex.ind);

	gl.activeTexture(gl.TEXTURE0 + tex.ind);
	gl.bindTexture(gl.TEXTURE_2D, tex.buf);
	active_texture = tex;

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, arr);
},
set_sub_texture: (name, [x, y], [w, h], arr) => {
	if(active_texture != texture[name]){
		gl.bindTexture(gl.TEXTURE_2D, texture[name].buf);
		active_texture = texture[name];
	}
	gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, arr);
},
set_texture_buf: (name, arr) => {
	let num = arr.length/4;
	let sr = (Math.log2(num)/2 + 1) | 0;
	let [w, h] = [2**sr,(num/2**sr | 0) + !!(num % 2**sr)];

	obj.set_texture(name, w, h, new Uint8Array(arr.buffer));
	obj.set_uniform(name + "_lt", "int", sr);
	obj.set_uniform(name + "_res", "vec2", [w, h]);
},
write_buf: (name, start, arr) => {
	let [w, h] = texture[name].res;

	let tl = [start % w, start / w | 0];
	if(start % w != 0){
		let cw = Math.min(w - tl[0], arr.length/4);
		obj.set_sub_texture(name, tl, [cw, 1], arr);
		tl = [0, tl[1] + 1];
		arr = arr.subarray(cw * 4);
	}


	let ch = arr.length/4/w | 0;
	if(ch)
		obj.set_sub_texture(name, [tl[0], tl[1]], [w, ch], arr);

	tl = [0, tl[1]+ch];
	arr = arr.subarray(ch * w * 4);
	let cw = arr.length/4;
	if(cw)
		obj.set_sub_texture(name, tl, [cw, 1], arr);
},
read_buf: (name, start, end) => {
	let buf = new Uint8Array(end - start);
	let [w, h] = texture[name].res;

	let arr = buf;

	let tl = [start % w, start / w | 0];
	if(start % w != 0){
		let cw = Math.min(w - tl[0], arr.length/4);
		obj.read_pixels(name, tl, [cw, 1], arr);
		tl = [0, tl[1] + 1];
		arr = arr.subarray(cw * 4);
	}


	let ch = arr.length/4/w | 0;
	if(ch)
		obj.read_pixels(name, [tl[0], tl[1]], [w, ch], arr);

	tl = [0, tl[1]+ch];
	arr = arr.subarray(ch * w * 4);
	let cw = arr.length/4;
	if(cw)
		obj.read_pixels(name, tl, [cw, 1], arr);

	return buf;
},
GpuUint8: (name) => {
	let w = gl.getParameter(gl.MAX_TEXTURE_SIZE)/4;
	rend.set_texture_buf(name, new Uint8Array(w*w*4).fill(0));

	let buf = DynUint8(w);
	let end = 0;
	
	let arr = new Uint8Array(4);
	arr_ind = 0;

	let obj = {
set: (ind, val) => {
	if(ind >= end){
		if(ind - end >= 1024)
			obj.flush();
		buf.set(ind - end, val);
		return val;
	}

	arr[arr_ind++] = val;
	if(arr_ind == 4){
		arr_ind = 0;
		rend.write_buf(name, ind/4 | 0, arr);
	}

	return val;
},
push: (val) => {
	if(buf.get_end() >= 1024)
		obj.flush();
	buf.push(val);
},
flush: () => {
	if(buf.get_end() != 0){
		rend.write_buf(name, end/4, buf.get_buffer().subarray(0, buf.get_end()));
		end += buf.get_end();
		buf = DynUint8();
	}
},
clear: () => {
	buf.clear();
	arr_ind = end = 0;
},
get_end: () => end + buf.get_end()
	}

	tex_bufs.push(obj);	
	return obj;
}
	};

	return obj;
}


