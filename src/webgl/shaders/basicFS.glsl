
uniform vec4 u_color;

uniform float u_ambientLightStrength;
uniform vec3 u_lightColor;
uniform vec3 u_lightPosition;
uniform vec3 u_cameraPosition;
uniform float u_specularStrength;
uniform float u_shininess;


in vec3 v_worldPosition;
in vec3 v_normal;

out vec4 outColor;

void main() {
  vec4 objectColor = u_color;
  vec4 resultColor = objectColor;
   #ifdef PHONG_MATERIAL
    // 环境光部分
    vec3 ambient = u_ambientLightStrength * u_lightColor;
    // diffuse部分
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightPosition - v_worldPosition);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * u_lightColor;
    // specular部分
    vec3 viewDir = normalize(u_cameraPosition - v_worldPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    vec3 specular = u_specularStrength * spec * u_lightColor;

    resultColor = vec4((ambient + diffuse + specular) * objectColor.rgb,objectColor.a);
   #endif

  outColor = resultColor;
}