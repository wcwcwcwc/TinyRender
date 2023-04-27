
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

// #ifdef SHADOW_MAP
//   uniform sampler2D u_shadowMapDepth;
//   in vec4 v_positionFromLight;
//   in float v_depthMetricSM;
// #endif

out vec4 outColor;

// #ifdef SHADOW_MAP
//   float ShadowCalculation(vec4 positionFromLight){
//     vec3 positionW = positionFromLight.xyz / positionFromLight.w;
//     vec3 positionNDC = positionW * 0.5 + 0.5;
//     // float currentDepth = positionNDC.z;
//     float cloestDepthInMap = texture(u_shadowMapDepth, positionNDC.xy).r;
//     float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
//     float shadow = currentDepth > cloestDepthInMap  ? 0.0 : 1.0;   
//     // 视锥体外保持原有颜色
//     if(currentDepth > 1.0 || positionNDC.x < 0.0 || positionNDC.x > 1.0 || positionNDC.y < 0.0 || positionNDC.y > 1.0){
//       shadow = 1.0;
//     }
//     return shadow;
//   }

//   float ShadowCalculationWithPoissonSampling(vec4 positionFromLight){
//     vec3 positionW = positionFromLight.xyz / positionFromLight.w;
//     vec3 positionNDC = positionW * 0.5 + 0.5;
//     float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
//     if (positionNDC.x < 0. || positionNDC.x > 1.0 || positionNDC.y < 0. || positionNDC.y > 1.0)
//     {
//         return 1.0;
//     }
//     else
//     {
//         float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
//         float visibility = 1.;

//         vec2 poissonDisk[4];
//         poissonDisk[0] = vec2(-0.94201624, -0.39906216);
//         poissonDisk[1] = vec2(0.94558609, -0.76890725);
//         poissonDisk[2] = vec2(-0.094184101, -0.92938870);
//         poissonDisk[3] = vec2(0.34495938, 0.29387760);
//         if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[0] / 1500.0).x < currentDepth) visibility -= 0.25;
//         if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[1] / 1500.0).x < currentDepth) visibility -= 0.25;
//         if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[2] / 1500.0).x < currentDepth) visibility -= 0.25;
//         if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[3] / 1500.0).x < currentDepth) visibility -= 0.25;
//         return visibility;
//     }
//   }
// #endif

void main() {

  vec4 objectColor = u_color;
  vec4 resultColor = objectColor;
  float shadow = 1.0;

  #include <shadowMapFragment>
  // #ifdef SHADOW_MAP
  //   shadow = ShadowCalculationWithPoissonSampling(v_positionFromLight);
  // #endif

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