in vec2 v_vUV;
out vec4 outColor;
uniform float u_lod;
uniform samplerCube u_textureSampler;
uniform samplerCube u_reflectionSampler;

#include <commonFragmentDeclaration>

void main(void) 
{
    float cx = v_vUV.x * 2. - 1.;
    float cy = v_vUV.y * 2. - 1.;

    float face = 0.;
    if (cy > 0.75) {
        outColor = vec4(0.);
        return;
    }
    else if (cy > 0.25) {
        if (cx > 0. && cx < 0.5) {
            face = 2.;
            cx = cx * 4. - 1.;
            cy = cy * 4. - 2.;
        }
        else {
            outColor = vec4(0.);
            return;
        }
    }
    else if (cy > -0.25) {
        cy = cy * 4.;
        if (cx > 0.5) {
            face = 0.;
            cx = cx * 4. - 3.;
        }
        else if (cx > 0.) {
            face = 4.;
            cx = cx * 4. - 1.;
        }
        else if (cx > -0.5) {
            face = 1.;
            cx = cx * 4. + 1.;
        }
        else  {
            face = 5.;
            cx = cx * 4. + 3.;
        }
    }
    else if (cy > -0.75) {
        if (cx > 0. && cx < 0.5) {
            face = 3.;
            cx = cx * 4. - 1.;
            cy = cy * 4. + 2.;
        }
        else {
            outColor = vec4(0.);
            return;
        }
    }
    else {
        outColor = vec4(0.);
        return;
    }

    vec3 dir = vec3(0.);
    if (face == 0.) { // PX
        dir = vec3( 1.,  cy, -cx);
        //  outColor = vec4(1.0,0.0,0.0,1.0);
    }
    else if (face == 1.) { // NX
        dir = vec3(-1.,  cy,  cx);
                //  outColor = vec4(1.0,1.0,0.0,1.0);
    }
    else if (face == 2.) { // PY
        dir = vec3( cx,  1., -cy);
                //  outColor = vec4(1.0,0.0,1.0,1.0);
    }
    else if (face == 3.) { // NY
        dir = vec3( cx, -1.,  cy);
                //  outColor = vec4(0.0,1.0,1.0,1.0);
    }
    else if (face == 4.) { // PZ
        dir = vec3( cx,  cy,  1.);
                //  outColor = vec4(0.5,0.0,1.0,1.0);
    }
    else if (face == 5.) { // NZ
        dir = vec3(-cx,  cy, -1.);
                //  outColor = vec4(0.2,0.7,1.0,1.0);
    }
    dir = normalize(dir);

    vec3 c = textureLod(u_reflectionSampler, dir, u_lod).rgb;
    outColor = vec4(toGammaSpace(c), 1.);
}