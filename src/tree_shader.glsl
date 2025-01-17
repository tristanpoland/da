precision highp float;
precision highp int;

uniform vec2 res;

uniform sampler2D tex;
uniform vec2 tex_res;
uniform int tex_lt;


uniform vec2 center;
uniform ivec4 node;
uniform int depth;
uniform float unit;

uniform int debug;

uniform mat4 transform;

/* 32bit int emulation */
ivec2 moddiv(int a, int b){
	int div = a / b, mod = a - div * b;
	return ivec2(mod, div);
}

ivec4 carry_prop(ivec4 a){
	ivec2 v;

	v = moddiv(a.r, 256);
	a.r = v.x;
	v = moddiv(a.g + v.y, 256);
	a.g = v.x;
	v = moddiv(a.b + v.y, 256);
	a.b = v.x;
	v = moddiv(a.a + v.y, 256);
	a.a = v.x;

	return a;
}

ivec4 rshift8(ivec4 a){return ivec4(a.g, a.b, a.a, 0);}

ivec4 rshift07(ivec4 a, int b){
	int v = int(float(a.r) * pow(0.5, float(b)));
	a = carry_prop(rshift8(a)*int(pow(2.0,float(8-b))));
	a.r = a.r + v;
	return a;
}

ivec4 rshift(ivec4 a, int b){
	ivec2 mul = moddiv(b, 7);
	for(int i = 0; i < 8; i++){
		if(mul.y - i == 0)
			break;
		a = rshift07(a, 7);
	}

	return rshift07(a, mul.x);
}

ivec4 lshift(ivec4 a, int b){
	ivec2 mul = moddiv(b, 7);
	for(int i = 0; i < 8; i++){
		if(mul.y - i == 0)
			break;
		a = carry_prop(a*int(pow(2.0, 7.0)));
	}

	return carry_prop(a*int(pow(2.0, float(mul.x))));
}



vec4 col_at(ivec4 ind){
	ivec4 v2 = rshift(ind, tex_lt);
	ivec4 v1 = ind - lshift(v2, tex_lt);

	vec2 tc = (vec2(v1.r + 256*v1.g, v2.r + 256*v2.g) + vec2(0.5)) / tex_res;
	return texture2D(tex, tc);
}

ivec4 vec4tonum(vec4 val){


/*
	//UNSIGNED_SHORT_4_4_4_4
	ivec4 val = ivec4(15.0*val + 0.5)
	return ivec4(val.r + 16*val.g, val.b + 16*val.a, 0, 0);
*/


/*
	UNSIGNED_SHORT_5_6_5
	ivec4 val = ivec4(31.0*val.r + 0.5, 63.0*val.g + 0.5, 31.0*val.b + 0.5, 0.0);
	return carry_prop(ivec4(val.r + 32*val.g, 8*val.g, 0, 0));
*/

	//RGBA
	return ivec4(255.0*val + 0.5);
}
ivec4 num_at(ivec4 ind){
/*
	//UNSIGNED_SHORT_4_4_4_4
	ind = lshift(ind, 1);
	return vec4tonum(col_at(ind + ivec4(0, 0, 0, 0)) + 
		lshift(vec4tonum(col_at(ind + ivec4(1, 0, 0, 0)), 16);
*/

	//RBGA
	return vec4tonum(col_at(ind));
}



void main(){
	vec2 pos = (transform * vec4(gl_FragCoord.xy, 0.0, 1.0)).xy;
	vec2 orig = center;

	ivec4 ind = node;
	float width = unit;

	if(debug == 1 && gl_FragCoord.x < center.x){
		vec2 p = gl_FragCoord.xy/res;
		p.x = p.x * 2.0;
		p.y = 1.0 - p.y;

		gl_FragColor = texture2D(tex, p);
		gl_FragColor.a = 1.0;
		return;
	}
/*
	else{
		vec2 p = gl_FragCoord.xy;

		if(p.y > tex_res.x * tex_res.y)
			discard;
		ivec4 ind = carry_prop(ivec4(p.y, 0, 0, 0));

		gl_FragColor = col_at(ind);
		gl_FragColor.a = 1.0;
		return;
	}
	*/


	for(int i = 0; i < 16; i++){
		if(i >= depth)
			break;

		vec2 quad = vec2(pos.x > orig.x, pos.y < orig.y);
		ind = ind * 5;
		ind.r = ind.r + 1 + int(quad.x + 2.0*quad.y);
		ind = num_at(carry_prop(ind));

		width = width / 2.0;
		orig = vec2(quad.x-0.5, 0.5-quad.y)*width + orig;
	}

	gl_FragColor = col_at(carry_prop(ind*5));
	gl_FragColor.a = 1.0;
}
