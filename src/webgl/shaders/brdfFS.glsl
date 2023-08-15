in vec2 v_vUV;
out vec4 outColor;

#include <commonFragmentDeclaration>

#include <hammersleyFragmentDeclaration>

#include <importanceSampleDeclaration>

const uint SAMPLE_COUNT = 16384u;

float smithVisibilityG1_TrowbridgeReitzGGXFast(float dot, float alphaG)
{
    float alphaSquared = alphaG * alphaG;
    return 1.0 / (dot + sqrt(alphaSquared + (1.0 - alphaSquared) * dot * dot));
}

float smithVisibility_TrowbridgeReitzGGXFast(float NdotL, float NdotV, float alphaG)
{
    float visibility = smithVisibilityG1_TrowbridgeReitzGGXFast(NdotL, alphaG) * smithVisibilityG1_TrowbridgeReitzGGXFast(NdotV, alphaG);
    return visibility;
}

float smithVisibility_GGXCorrelated(float NdotL, float NdotV, float alphaG) 
{
    float a2 = alphaG * alphaG;
    float GGXV = NdotL * sqrt(NdotV * (NdotV - a2 * NdotV) + a2);
    float GGXL = NdotV * sqrt(NdotL * (NdotL - a2 * NdotL) + a2);
    return 0.5 / (GGXV + GGXL);
}

vec2 packResult(float V, float Fc) {
    vec2 result;
    result.x = (1.0 - Fc) * V;
    result.y = Fc * V;
    return result;
}

// NDF为GGX时，采用smith分离的阴影遮蔽函数：shadowing和masking两者相互独立，因此相乘
// #define visibility(nov, nol, a) smithVisibility_TrowbridgeReitzGGXFast(nov, nol, a)
// 考虑高度相关的阴影遮蔽函数
#define visibility(nov, nol, a) smithVisibility_GGXCorrelated(nov, nol, a)

vec3 DFV(float NdotV, float roughness) {
    vec3 result = vec3(0.);

    vec3 V;
    V.x = sqrt(1.0 - NdotV*NdotV);
    V.y = 0.0;
    V.z = NdotV;

    float alpha = square(roughness);

    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = hammersley(i, SAMPLE_COUNT);

        vec3 H  = hemisphereImportanceSampleDggx(Xi, alpha);
        vec3 L  = normalize(2.0 * dot(V, H) * H - V);

        float VdotH = saturate(dot(V, H));
        float NdotL = saturate(L.z);
        float NdotH = saturate(H.z);

        if(NdotL > 0.0)
        {
            // V项包含了G项，即V=G/4(nl)(nv)
            float Vis = visibility(NdotV, NdotL, alpha);
            float WeightedVis = Vis * (VdotH / NdotH) * NdotL;
            float Fc = pow5(1.0 - VdotH);

            result.rg += packResult(WeightedVis, Fc);
        }
    }

    result = result * 4. / float(SAMPLE_COUNT);

    return result;
}

void main() 
{
    vec3 integratedBRDF = DFV(v_vUV.x, v_vUV.y);

    outColor = toRGBD(integratedBRDF);

}