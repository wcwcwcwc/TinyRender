
in vec3 a_position;


uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out float v_depthMetricSM;

void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);
  v_depthMetricSM = (gl_Position.z+1.0) / 10001.0;

}
