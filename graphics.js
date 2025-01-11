
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
	let texture = {}
	let textures = 0;

	let positions = [1, 1, -1, 1, 1, -1, -1, -1];

	let obj = {
		draw: () => {
			gl.useProgram(shader_program);

			let vert_pos = gl.getAttribLocation(shader_program, "aVertexPosition");
			gl.bindBuffer(gl.ARRAY_BUFFER, pos_buf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, pos_buf);

			gl.vertexAttribPointer(
				vert_pos,
				2,
				gl.FLOAT,
				false,
				0,
				0
			);

			gl.enableVertexAttribArray(vert_pos);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		},
		set_uniform: (name, type, value) => {
			gl.useProgram(shader_program);
			let uniform_loc = gl.getUniformLocation(shader_program, name);

			let type_lut = {
				"float": (loc, x) => gl.uniform1f(loc, x),
				"vec2": (loc, v) => gl.uniform2f(loc, ...v),
				"vec3": (loc, v) => gl.uniform3f(loc, ...v),
				"vec4": (loc, v) => gl.uniform4f(loc, ...v),
				"ivec4": (loc, v) => gl.uniform4i(loc, ...v),
				"mat4": (loc, v) => gl.uniformMatrix4fv(loc, false, v),
				"int": (loc, x) => gl.uniform1i(loc, x)
			};

			type_lut[type](uniform_loc, value);
		},
		set_texture: (name, w, h, arr) => {
			gl.useProgram(shader_program);

			let tex = texture[name] ?? (texture[name] = {
				ind: ++textures,
				buf: gl.createTexture()
			});

			tex.res = [w, h];

			let loc = gl.getUniformLocation(shader_program, name)

			obj.set_uniform(name, "int", tex.ind);
			gl.activeTexture(gl.TEXTURE0 + tex.ind);
			gl.bindTexture(gl.TEXTURE_2D, tex.buf);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, arr);
		},
		set_sub_texture: (name, [x, y], [w, h], arr) => {
			gl.useProgram(shader_program);
			gl.bindTexture(gl.TEXTURE_2D, texture[name].buf);
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, arr);
		},
		set_texture_buf: (name, arr) => {
			gl.useProgram(shader_program);
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
		}
		
	};

	return obj;
}

