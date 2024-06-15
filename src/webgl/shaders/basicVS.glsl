
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

#include <shadowMapVertexDeclaration>

out vec3 v_worldPosition;
out vec3 v_normal;


void main() {

  gl_Position = u_projectionMatrix * u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);

  mat3 normalWorld = mat3(u_worldMatrix);
  v_normal = normalize(normalWorld*a_normal);
  v_worldPosition = vec3(u_worldMatrix * vec4(a_position,1.0));

  #include <shadowMapVertex>

}
