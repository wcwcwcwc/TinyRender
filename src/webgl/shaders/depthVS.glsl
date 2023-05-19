
in vec3 a_position;
in vec3 a_normal;


uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_lightPosition;
uniform vec2 u_depthValue;
uniform vec2 u_biasAndScale;

out float v_depthMetricSM;

void main() {
  
  mat3 normalWorld = mat3(u_worldMatrix);
  vec3 v_normal = normalize(normalWorld*a_normal);
  vec3 v_worldPosition = vec3(u_worldMatrix * vec4(a_position,1.0));
  vec3 directionToLightSM = u_lightPosition - v_worldPosition;
  vec3 worldLightDirSM = normalize(directionToLightSM);
  float ndlSM = dot(v_normal, worldLightDirSM);
  float sinNLSM = sqrt(1.0-ndlSM*ndlSM);
  float normalBias = u_biasAndScale.y*sinNLSM;
  // 物体沿法线方向收缩
  v_worldPosition.xyz -= v_normal*normalBias;
  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(v_worldPosition,1.0);

  //gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);

  gl_Position.z += u_biasAndScale.x * gl_Position.w;
  // 归一化[0, 1]。gl_Position.z可能因为bias超过1，因此需要归一化
  // 平行光采用正交矩阵，depthValue.x = 1.0，depthValue.y = 2.0，归一化为[0，1]
  // 点光源采用投影矩阵，depthValue.x = nearZ，depthValue.y = nearZ + farZ，归一化为[0，1]
  v_depthMetricSM = (gl_Position.z + u_depthValue.x) / u_depthValue.y;

}
