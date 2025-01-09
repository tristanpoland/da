
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
	shader_program = gl_init_shader(gl,
`
precision highp float;
attribute vec2 aVertexPosition;

void main(){
	gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`, fsource);



	let vert_pos = gl.getAttribLocation(shader_program, "aVertexPosition");

	let pos_buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pos_buf);

	let positions = [1, 1, -1, 1, 1, -1, -1, -1];

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


	let texture = gl.createTexture();

	gl.useProgram(shader_program);
	return {
		draw: () => {
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		},
		set_uniform: (name, type, value) => {
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
			gl.bindTexture(gl.TEXTURE_2D, texture);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, arr);
		}
	};
}

