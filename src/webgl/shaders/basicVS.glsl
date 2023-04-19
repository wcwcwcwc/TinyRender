#version 300 es

in vec4 a_position;
in vec4 a_color;

uniform mat4 u_wolrMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec4 v_color;

void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * u_wolrMatrix * a_position;

  v_color = a_color;

}
