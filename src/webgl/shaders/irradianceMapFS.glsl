in vec2 v_vUV;
uniform float u_face;
uniform samplerCube u_reflectionSampler;
uniform vec2 u_textureInfo;

out vec4 outColor;

#include <commonFragmentDeclaration>

#include <hammersleyFragmentDeclaration>

#include <importanceSampleDeclaration>

const uint SAMPLE_COUNT = 4096u;

const float SAMPLE_COUNT_FLOAT = float(SAMPLE_COUNT);
const float SAMPLE_COUNT_FLOAT_INVERSED = 1. / SAMPLE_COUNT_FLOAT;

const float K = 4.;

float log4(float x) {
    return log2(x) / 2.;
}

vec3 irradiance(vec3 N) {
    vec3 result = vec3(0.0);

    vec3 up = abs(N.z) < 0.999 ? vec3(0, 0, 1) : vec3(1, 0, 0);

    mat3 R;
    R[0] = normalize(cross(up, N));
    R[1] = cross(N, R[0]);
    R[2] = N;

    float maxLevel = u_textureInfo.y;
    float dim0 = u_textureInfo.x;
    float omegaP = (4. * PI) / (6. * dim0 * dim0);

    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);
        vec3 Ls = hemisphereCosSample(Xi);

        Ls = normalize(Ls);

        vec3 Ns = vec3(0., 0., 1.);

        float NoL = dot(Ns, Ls);

        if (NoL > 0.) {
            float pdf_inversed = PI / NoL;

            float omegaS = SAMPLE_COUNT_FLOAT_INVERSED * pdf_inversed;
            float l = log4(omegaS) - log4(omegaP) + log4(K);
            float mipLevel = clamp(l, 0.0, maxLevel);

            vec3 c = textureLod(u_reflectionSampler, R * Ls, mipLevel).rgb;
            result += c;
        }
    }

    result = result * SAMPLE_COUNT_FLOAT_INVERSED;

    return result;
}



void main() 
{
    float cx = v_vUV.x * 2. - 1.;
    float cy = (1. - v_vUV.y) * 2. - 1.;
    // 法向量，cubemap纹理法向量等于顶点-中心点【0，0】
    vec3 dir = vec3(0.);
    if (u_face == 0.) { // PX
        dir = vec3( 1.,  cy, -cx);
    }
    else if (u_face == 1.) { // NX
        dir = vec3(-1.,  cy,  cx);
    }
    else if (u_face == 2.) { // PY
        dir = vec3( cx,  1., -cy);
    }
    else if (u_face == 3.) { // NY
        dir = vec3( cx, -1.,  cy);
    }
    else if (u_face == 4.) { // PZ
        dir = vec3( cx,  cy,  1.);
    }
    else if (u_face == 5.) { // NZ
        dir = vec3(-cx,  cy, -1.);
    }
    dir = normalize(dir);

    vec3 integratedBRDF = irradiance(dir);

    outColor = vec4(integratedBRDF, 1.);
}