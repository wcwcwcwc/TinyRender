
in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;


#include <shadowMapVertexDeclaration>

// #ifdef SHADOW_MAP
//   uniform mat4 u_lightViewMatrix;
//   uniform mat4 u_lightProjectionMatrix;
//   uniform vec2 u_depthValue;
//   out vec4 v_positionFromLight;
//   out float v_depthMetricSM;
// #endif


out vec3 v_worldPosition;
out vec3 v_normal;


void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);

  mat3 normalWorld = mat3(u_worldMatrix);
  v_normal = normalize(normalWorld*a_normal);
  v_worldPosition = vec3(u_worldMatrix * vec4(a_position,1.0));

  #include <shadowMapVertex>
  // #ifdef SHADOW_MAP
  // v_positionFromLight = u_lightProjectionMatrix * u_lightViewMatrix * u_worldMatrix * vec4(a_position,1.0);
  // v_depthMetricSM = (v_positionFromLight.z + u_depthValue.x) / u_depthValue.y;
  // #endif

}
