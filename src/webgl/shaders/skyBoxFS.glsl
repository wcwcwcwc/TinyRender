
uniform samplerCube u_reflectionCubeSampler;
in vec3 v_postion;
in vec3 v_worldPosition;
in vec3 v_normal;
out vec4 glFragColor;

#include <commonFragmentDeclaration>

void main(void) {
    
    vec3 normalW = normalize(v_normal);
    vec3 vReflectionUVW = v_postion;
    vec4 reflectionColor = vec4(0., 0., 0., 1.);
    reflectionColor = texture(u_reflectionCubeSampler, vReflectionUVW);
    reflectionColor.rgb = toGammaSpace(reflectionColor.rgb);
    vec4 color = vec4(reflectionColor.rgb, 1.0);
    // vec4 color = vec4(1.0,0.0,0.0, 1.0);
    glFragColor = color;

}