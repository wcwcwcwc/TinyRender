
in vec3 a_position;


uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec2 u_depthValue;
uniform vec2 u_biasAndScale;

out float v_depthMetricSM;

void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);
  // 归一化[0, 1]。gl_Position.z可能因为bias超过1，因此需要归一化
  // 平行光采用正交矩阵，depthValue.x = 1.0，depthValue.y = 2.0，归一化为[0，1]
  // 平行光采用正交矩阵，depthValue.x = nearZ，depthValue.y = nearZ + farZ，归一化为[0，1]
  gl_Position.z += u_biasAndScale.x * gl_Position.w;
  v_depthMetricSM = (gl_Position.z + u_depthValue.x) / u_depthValue.y;

}
