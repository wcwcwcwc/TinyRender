attribute vec2 a_position;

varying vec2 v_vUV;

const vec2 madd = vec2(0.5, 0.5);

void main(void) {

	v_vUV = (a_position * madd + madd);
	gl_Position = vec4(a_position, 0.0, 1.0);

}