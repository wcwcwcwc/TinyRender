// Burley拟合的Disney的diffuse项
float diffuseBRDF_Burley(float NdotL, float NdotV, float VdotH, float roughness) {
    float diffuseFresnelNV = pow5(saturateEps(1.0-NdotL));
    float diffuseFresnelNL = pow5(saturateEps(1.0-NdotV));
    float diffuseFresnel90 = 0.5+2.0*VdotH*VdotH*roughness;
    float fresnel = (1.0+(diffuseFresnel90-1.0)*diffuseFresnelNL) *
    (1.0+(diffuseFresnel90-1.0)*diffuseFresnelNV);
    return fresnel/PI;
}
// F项
vec3 fresnelSchlickGGX(float VdotH, vec3 reflectance0, vec3 reflectance90) {
    return reflectance0+(reflectance90-reflectance0)*pow5(1.0-VdotH);
}
// G项
float smithVisibility_GGXCorrelated(float NdotL, float NdotV, float alphaG) 
{
    float a2 = alphaG * alphaG;
    float GGXV = NdotL * sqrt(NdotV * (NdotV - a2 * NdotV) + a2);
    float GGXL = NdotV * sqrt(NdotL * (NdotL - a2 * NdotL) + a2);
    return 0.5 / (GGXV + GGXL);
}
// // N项
float normalDistributionFunction_TrowbridgeReitzGGX(float NdotH, float alphaG) {
    float a2 = square(alphaG);
    float d = NdotH*NdotH*(a2-1.0)+1.0;
    return a2/(PI*d*d);
}

#ifdef LIGHT
    vec3 computeDiffuseLighting(preLightingInfo info, vec3 lightColor) {
        float diffuseTerm = diffuseBRDF_Burley(info.NdotL, info.NdotV, info.VdotH, info.roughness);
        return diffuseTerm*info.attenuation*info.NdotL*lightColor;
    }

    vec3 computeSpecularLighting(preLightingInfo info, vec3 N, vec3 reflectance0, vec3 reflectance90, float geometricRoughnessFactor, vec3 lightColor) {
        float NdotH = saturateEps(dot(N, info.H));
        float roughness = max(info.roughness, geometricRoughnessFactor);
        float alphaG = square(roughness)+0.0005;
        vec3 fresnel = fresnelSchlickGGX(info.VdotH, reflectance0, reflectance90);
        float distribution = normalDistributionFunction_TrowbridgeReitzGGX(NdotH, alphaG);
        float smithVisibility = smithVisibility_GGXCorrelated(info.NdotL, info.NdotV, alphaG);
        vec3 specTerm = fresnel*distribution*smithVisibility;
        return specTerm*info.attenuation*info.NdotL*lightColor;
    }
#endif
