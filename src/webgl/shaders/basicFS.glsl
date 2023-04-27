
uniform vec4 u_color;

uniform float u_ambientLightStrength;
uniform vec3 u_lightColor;
uniform vec3 u_lightPosition;
uniform vec3 u_cameraPosition;
uniform float u_specularStrength;
uniform float u_shininess;

in vec3 v_worldPosition;
in vec3 v_normal;

#include <shadowMapFragmentDeclaration>

out vec4 outColor;

void main() {

  vec4 objectColor = u_color;
  vec4 resultColor = objectColor;
  float shadow = 1.0;

  #include <shadowMapFragment>

  resultColor.rgb = resultColor.rgb * shadow;

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
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    // blinn-phong
    float spec = pow(max(dot(normal, halfwayDir), 0.0), u_shininess); 
    // phong
    // float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    vec3 specular = u_specularStrength * spec * u_lightColor;
    resultColor.rgb = (ambient + (diffuse + specular) * shadow ) * objectColor.rgb;
  #endif

  outColor = resultColor;
}