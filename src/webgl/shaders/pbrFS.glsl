uniform vec3 u_eyePosition;
uniform vec4 u_baseColor;
uniform sampler2D u_reflectivitySampler;
uniform sampler2D u_environmentBrdfSampler;
uniform samplerCube u_reflectionSampler;
uniform vec4 u_metallicReflectanceFactors;
uniform vec4 u_reflectivityColor;
uniform vec3 u_reflectionMicrosurfaceInfos;
uniform vec3 u_reflectionColor;
uniform mat4 u_reflectionMatrix;
uniform vec2 u_reflectionFilteringInfo;
uniform vec3 u_ambientColor;
uniform vec3 u_emissiveColor;
uniform vec4 u_lightingIntensity;

#ifdef IRRADIANCEMAP_ENABLED
    uniform samplerCube u_irradianceMapSampler;
#endif

#ifdef PREFILTEREDENVIRONMENTMAP_ENABLED
    uniform samplerCube u_prefilteredEnvironmentMapSampler;
#endif

#ifdef NORMAL_TEXTURE
    uniform sampler2D u_normalTextureSampler;
#endif

#ifdef EMISSIVE_TEXTURE
    uniform sampler2D u_emissiveTextureSampler;
#endif

#ifdef AMBIENT_OCCLUSION_TEXTURE
    uniform sampler2D u_ambientOcclusionTextureSampler;
#endif

#ifdef BASE_COLOR_TEXTURE
    uniform sampler2D u_baseColorTextureSampler;
#endif

#include <sphericalHarmonicsIrradianceDeclaration>

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_mainUV1;
out vec4 glFragColor;

#include <commonFragmentDeclaration>

#include <hammersleyFragmentDeclaration>

#include <importanceSampleDeclaration>

struct reflectivityOutParams {
    float microSurface;
    float roughness;
    vec3 surfaceReflectivityColor;
    vec3 surfaceAlbedo;
};

struct reflectionOutParams {
    vec4 environmentRadiance;
    vec3 environmentIrradiance;
    vec3 reflectionCoords;
};

#define NUM_SAMPLES 8u

const float NUM_SAMPLES_FLOAT = float(NUM_SAMPLES);
const float NUM_SAMPLES_FLOAT_INVERSED = 1./NUM_SAMPLES_FLOAT;
const float K = 4.;

float normalDistributionFunction_TrowbridgeReitzGGX(float NdotH, float alphaG) {
    float a2 = square(alphaG);
    float d = NdotH*NdotH*(a2-1.0)+1.0;
    return a2/(PI*d*d);
}

float log4(float x) {
    return log2(x)/2.;
}

void reflectivityBlock(
in vec4 vReflectivityColor, 
in vec3 surfaceAlbedo, 
in vec4 metallicReflectanceFactors, 

#ifdef METALLICROUGHNESSTEXTURE_ENABLED
    in vec4 surfaceMetallicOrReflectivityColorMap, 
#endif

out reflectivityOutParams outParams
) {
    float microSurface = vReflectivityColor.a;
    vec3 surfaceReflectivityColor = vReflectivityColor.rgb;
    vec2 metallicRoughness = surfaceReflectivityColor.rg; // 金属度、粗糙度系数

    #ifdef METALLICROUGHNESSTEXTURE_ENABLED
        metallicRoughness.r *= surfaceMetallicOrReflectivityColorMap.b; // 金属度
        metallicRoughness.g *= surfaceMetallicOrReflectivityColorMap.g; // 粗糙度
    #endif

    microSurface = 1.0-metallicRoughness.g;
    vec3 baseColor = surfaceAlbedo;
    vec3 metallicF0 = metallicReflectanceFactors.rgb; // 默认0.4，ior为1到1.5
    // 如果全金属，没有表面颜色，如电介质，surfaceAlbedo（漫反射颜色）= 表面颜色*（1-反射率），1-F0表示进入物体内部（发生漫反射）的部分
    outParams.surfaceAlbedo = mix(baseColor.rgb*(1.0-metallicF0), vec3(0., 0., 0.), metallicRoughness.r);
    // 反射率颜色，新的F0
    surfaceReflectivityColor = mix(metallicF0, baseColor, metallicRoughness.r);
    microSurface = saturate(microSurface);
    float roughness = 1.-microSurface;
    outParams.microSurface = microSurface;
    outParams.roughness = roughness;
    outParams.surfaceReflectivityColor = surfaceReflectivityColor;
}

// 采用屏幕偏微分,近似求取TBN矩阵,在模型边缘可能效果不太好
// 用于法线贴图中的法线转为世界坐标下的法线
mat3 cotangent_frame(vec3 normal, vec3 p, vec2 uv, vec2 tangentSpaceParams) {
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    vec3 dp2perp = cross(dp2, normal);
    vec3 dp1perp = cross(normal, dp1);
    vec3 tangent = dp2perp*duv1.x+dp1perp*duv2.x;
    vec3 bitangent = dp2perp*duv1.y+dp1perp*duv2.y;
    tangent *= tangentSpaceParams.x;
    bitangent *= tangentSpaceParams.y;
    float invmax = inversesqrt(max(dot(tangent, tangent), dot(bitangent, bitangent)));
    return mat3(tangent*invmax, bitangent*invmax, normal);
}

vec3 perturbNormalBase(mat3 cotangentFrame, vec3 normal, float scale) {
    normal = normalize(normal*vec3(scale, scale, 1.0));
    return normalize(cotangentFrame*normal);
}
vec3 perturbNormal(mat3 cotangentFrame, vec3 textureSample, float scale) {
    return perturbNormalBase(cotangentFrame, textureSample*2.0-1.0, scale);
}

float environmentHorizonOcclusion(vec3 view, vec3 normal, vec3 geometricNormal) {
    vec3 reflection = reflect(view, normal);
    float temp = saturate(1.0+1.1*dot(reflection, geometricNormal));
    return square(temp);
}

vec3 getBRDFLookup(float NdotV, float perceptualRoughness) {
    vec2 UV = vec2(NdotV, perceptualRoughness);
    vec4 brdfLookup = texture(u_environmentBrdfSampler, UV);
    brdfLookup.rgb = fromRGBD(brdfLookup.rgba);
    return brdfLookup.rgb;
}
vec3 computeCubicCoords(vec4 worldPos, vec3 worldNormal, vec3 eyePosition, mat4 reflectionMatrix) {
    vec3 viewDir = normalize(worldPos.xyz-eyePosition);
    vec3 coords = reflect(viewDir, worldNormal);
    coords = vec3(reflectionMatrix*vec4(coords, 0));
    #ifdef INVCUBIC
        coords.y *= -1.0;
    #endif
    return coords;
}
vec3 computeReflectionCoords(vec4 worldPos, vec3 worldNormal) {
    return computeCubicCoords(worldPos, worldNormal, u_eyePosition, u_reflectionMatrix);
}

void createReflectionCoords(
in vec3 vPositionW, in vec3 normalW, out vec3 reflectionCoords
) {
    vec3 reflectionVector = computeReflectionCoords(vec4(v_worldPosition, 1.0), v_normal);
    reflectionVector.z *= -1.0;
    reflectionCoords = reflectionVector;
}

float getLodFromAlphaG(float cubeMapDimensionPixels, float microsurfaceAverageSlope) {
    float microsurfaceAverageSlopeTexels = cubeMapDimensionPixels*microsurfaceAverageSlope;
    float lod = log2(microsurfaceAverageSlopeTexels);
    return lod;
}

vec3 radiance(float alphaG, samplerCube inputTexture, vec3 inputN, vec2 filteringInfo) {
    vec3 n = normalize(inputN);
    if (alphaG == 0.) {
        vec3 c = texture(inputTexture, n).rgb;
        return c;
    }
    else {
        vec3 result = vec3(0.);
        vec3 tangent = abs(n.z)<0.999 ? vec3(0., 0., 1.) : vec3(1., 0., 0.);
        tangent = normalize(cross(tangent, n));
        vec3 bitangent = cross(n, tangent);
        mat3 tbn = mat3(tangent, bitangent, n);
        float maxLevel = filteringInfo.y;
        float dim0 = filteringInfo.x;
        float omegaP = (4.*PI)/(6.*dim0*dim0);
        float weight = 0.;
        for(uint i = 0u;
        i<NUM_SAMPLES;
        ++i) {
            vec2 Xi = hammersley(i, NUM_SAMPLES);
            vec3 H = hemisphereImportanceSampleDggx(Xi, alphaG);
            // V=N=R
            float NoV = 1.;
            float NoH = H.z;
            float NoH2 = H.z*H.z;
            float NoL = 2.*NoH2-1.;
            vec3 L = vec3(2.*NoH*H.x, 2.*NoH*H.y, NoL);
            L = normalize(L);
            if (NoL>0.) {
                // 由于假定V=N=R，则PDF（L） = D(h)*(h*n)/4(h*v) =  D(h) / 4
                float pdf_inversed = 4./normalDistributionFunction_TrowbridgeReitzGGX(NoH, alphaG);
                float omegaS = NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;
                float l = log4(omegaS)-log4(omegaP)+log4(K);
                float mipLevel = clamp(float(l), 0.0, maxLevel);
                weight += NoL;
                vec3 c = textureLod(inputTexture, tbn*L, mipLevel).rgb;
                result += c*NoL;
            }

        }
        result = result/weight;
        return result;
    }

}

void sampleReflectionTexture(
in float alphaG, in vec3 vReflectionMicrosurfaceInfos, in vec2 vReflectionInfos, in vec3 vReflectionColor, in samplerCube reflectionSampler, const vec3 reflectionCoords, in vec2 vReflectionFilteringInfo, out vec4 environmentRadiance
) {
    // 预过滤贴图打开的话，直接按照粗糙度作为lod，反射方向进行贴图采样
    // 默认，则为实时渲染处理，与irradiance处理一样，计算lod，采样原贴图
    #ifdef PREFILTEREDENVIRONMENTMAP_ENABLED
        float reflectionLOD = getLodFromAlphaG(vReflectionMicrosurfaceInfos.x, alphaG);
        reflectionLOD = reflectionLOD*vReflectionMicrosurfaceInfos.y+vReflectionMicrosurfaceInfos.z;
        environmentRadiance = textureLod(u_prefilteredEnvironmentMapSampler, reflectionCoords, reflectionLOD);
    #else
        environmentRadiance = vec4(radiance(alphaG, reflectionSampler, reflectionCoords, vReflectionFilteringInfo), 1.0);
    #endif

    #ifdef GAMMAREFLECTION
        environmentRadiance.rgb = toLinearSpace(environmentRadiance.rgb);
    #endif
    
    environmentRadiance.rgb *= vReflectionInfos.x;
    environmentRadiance.rgb *= vReflectionColor.rgb;
}
vec3 getReflectanceFromBRDFLookup(const vec3 specularEnvironmentR0, const vec3 specularEnvironmentR90, const vec3 environmentBrdf) {
    vec3 reflectance = specularEnvironmentR0*environmentBrdf.x+specularEnvironmentR90*environmentBrdf.y;
    return reflectance;
}

vec3 irradiance(samplerCube inputTexture, vec3 inputN, vec2 filteringInfo) {
    // 实时求取BRDF的漫反射部分，采用了半球的余弦重要性采样，pdf为：cosΘ/PI
    // 但是：余弦权重的半球采样只考虑了PDF曲线的本身，忽略了IBL贴图的实际内容，因为需要根据PDF对环境贴图进行平均采样
    // 这里采用平均的一个方法：mipmap。核心是计算lod，目标是减少采样次数
    // 参考：https://dcgi.fel.cvut.cz/publications/2008/krivanek-cgf-rts
    vec3 n = normalize(inputN);
    vec3 result = vec3(0.0);
    vec3 tangent = abs(n.z)<0.999 ? vec3(0., 0., 1.) : vec3(1., 0., 0.);
    tangent = normalize(cross(tangent, n));
    vec3 bitangent = cross(n, tangent);
    mat3 tbn = mat3(tangent, bitangent, n);
    float maxLevel = filteringInfo.y;
    float dim0 = filteringInfo.x;
    // 单位像素对应多少立体角
    float omegaP = (4.*PI)/(6.*dim0*dim0);
    for(uint i = 0u;
    i<NUM_SAMPLES;
    ++i) {
        // hammersley求取[0-1]低差异随机数
        vec2 Xi = hammersley(i, NUM_SAMPLES);
        // 余弦半球采样，将二维平面的随机[0-1]转换为三维球面上的权重为余弦的xyz向量
        vec3 Ls = hemisphereCosSample(Xi);
        Ls = normalize(Ls);
        vec3 Ns = vec3(0., 0., 1.);
        float NoL = dot(Ns, Ls);
        if (NoL>0.) {
            float pdf_inversed = PI/NoL;
            float omegaS = NUM_SAMPLES_FLOAT_INVERSED*pdf_inversed;
            // 总立体角/单位像素对应多少立体角 = 需要计算的像素 = level
            float l = log4(omegaS)-log4(omegaP)+log4(K);
            float mipLevel = clamp(l, 0.0, maxLevel);
            vec3 c = textureLod(inputTexture, tbn*Ls, mipLevel).rgb;
            result += c;
        }

    }
    result = result*NUM_SAMPLES_FLOAT_INVERSED;
    return result;
}
void reflectionBlock(
in vec3 vPositionW, in vec3 normalW, in float alphaG, in vec3 vReflectionMicrosurfaceInfos, in vec2 vReflectionInfos, in vec3 vReflectionColor, in samplerCube reflectionSampler, in mat4 reflectionMatrix, in vec2 vReflectionFilteringInfo, out reflectionOutParams outParams
) {
    vec4 environmentRadiance = vec4(0., 0., 0., 0.);
    vec3 reflectionCoords = vec3(0.);
    // 计算反射坐标
    createReflectionCoords(
    vPositionW, normalW, reflectionCoords
    );
    sampleReflectionTexture(
    alphaG, vReflectionMicrosurfaceInfos, vReflectionInfos, vReflectionColor, reflectionSampler, reflectionCoords, vReflectionFilteringInfo, environmentRadiance
    );
    vec3 environmentIrradiance = vec3(0., 0., 0.);
    vec3 irradianceVector = vec3(reflectionMatrix*vec4(normalW, 0)).xyz;

    #ifdef INVCUBIC
        irradianceVector.y *= -1.0;
    #endif

    irradianceVector.z *=-1.0;

    #ifdef IRRADIANCEMAP_ENABLED
        vec3 n = normalize(irradianceVector);
        environmentIrradiance = textureLod(u_irradianceMapSampler, n, 0.0).rgb;
    #else
        #ifdef SPHERICALHARMONICS_ENABLED
            environmentIrradiance = computeSHIrradiance(normalize(irradianceVector));
        #else
            environmentIrradiance = irradiance(reflectionSampler, irradianceVector, vReflectionFilteringInfo);
        #endif
    #endif
    
    environmentIrradiance *= vReflectionColor.rgb;
    outParams.environmentRadiance = environmentRadiance;
    outParams.environmentIrradiance = environmentIrradiance;
    outParams.reflectionCoords = reflectionCoords;
}

void main() {
    vec3 viewDirectionW = normalize(u_eyePosition-v_worldPosition);
    vec3 normalW = normalize(v_normal);
    // 保存真实片元的法向
    vec3 trueNormalW = normalW;

    // 如果有法线贴图,法线贴图中的法线通过TBN矩阵转为世界坐标下的法线
    #ifdef NORMAL_TEXTURE
        mat3 TBN = cotangent_frame(normalW, vec3(v_worldPosition), v_mainUV1, vec2(1.0, -1.0));
        normalW = perturbNormal(TBN, texture(u_normalTextureSampler, v_mainUV1).xyz, 1.0);
    #endif 

    // albedo
    vec3 surfaceAlbedo = u_baseColor.rgb;
    float alpha = u_baseColor.a;

    // 存在baseColor贴图时，albedo
    #ifdef BASE_COLOR_TEXTURE
        vec4 albedoTexture = texture(u_baseColorTextureSampler, v_mainUV1);
        surfaceAlbedo *= toLinearSpace(albedoTexture.rgb);
    #endif 

    // ao
    vec3 ambientOcclusionColor = vec3(1., 1., 1.);
    // 存在AO贴图时
    #ifdef AMBIENT_OCCLUSION_TEXTURE
        ambientOcclusionColor = texture(u_ambientOcclusionTextureSampler, v_mainUV1).rgb;
    #endif
    vec3 baseColor = surfaceAlbedo;

    // 金属度粗糙度纹理
    #ifdef METALLICROUGHNESSTEXTURE_ENABLED
        vec4 surfaceMetallicOrReflectivityColorMap = texture(u_reflectivitySampler, v_mainUV1);
    #endif

    //(f0,f90)
    vec4 metallicReflectanceFactors = u_metallicReflectanceFactors;
    reflectivityOutParams reflectivityOut;
    // 反射率颜色计算部分，计算金属和电介质的反射率颜色
    reflectivityBlock(
    u_reflectivityColor, 
    surfaceAlbedo, 
    metallicReflectanceFactors, 
    #ifdef METALLICROUGHNESSTEXTURE_ENABLED
        surfaceMetallicOrReflectivityColorMap, 
    #endif
    reflectivityOut
    );
    float roughness = reflectivityOut.roughness;
    surfaceAlbedo = reflectivityOut.surfaceAlbedo;
    float NdotVUnclamped = dot(normalW, viewDirectionW);//nv
    float NdotV = absEps(NdotVUnclamped);
    float alphaG = square(roughness)+0.0005; // 粗糙度平方
    // brdfLUT的采样
    vec3 environmentBrdf = getBRDFLookup(NdotV, roughness);

    // 存在法线贴图时,计算出来的反射方向有时候会在片元下面,这部分高光仍然着色器的话,会造成漏光,因此eho用于补偿
    float eho = environmentHorizonOcclusion(-viewDirectionW, normalW, trueNormalW);
    reflectionOutParams reflectionOut;
    // 计算漫反射irrdiance和镜面反射radiance的前半部分
    reflectionBlock(
    v_worldPosition, normalW, alphaG, u_reflectionMicrosurfaceInfos, vec2(1.0,0.0), u_reflectionColor, u_reflectionSampler, u_reflectionMatrix, u_reflectionFilteringInfo, reflectionOut
    );
    vec3 specularEnvironmentR0 = reflectivityOut.surfaceReflectivityColor.rgb;
    vec3 specularEnvironmentR90 = vec3(metallicReflectanceFactors.a);
    vec3 specularEnvironmentReflectance = getReflectanceFromBRDFLookup(specularEnvironmentR0, specularEnvironmentR90, environmentBrdf);

    // 补偿漏光
    specularEnvironmentReflectance *= eho;

    vec3 finalIrradiance = reflectionOut.environmentIrradiance;
    // surfaceAlbedo 包含了发生漫反射的系数，即1-F0
    finalIrradiance *= surfaceAlbedo.rgb;
    finalIrradiance *= u_lightingIntensity.z;
    finalIrradiance *= ambientOcclusionColor;
    vec3 finalRadiance = reflectionOut.environmentRadiance.rgb;
    finalRadiance *= specularEnvironmentReflectance;
    vec3 finalRadianceScaled = finalRadiance*u_lightingIntensity.z;

    vec3 diffuseBase = vec3(0., 0., 0.);
    vec3 finalDiffuse = diffuseBase;
    finalDiffuse *= surfaceAlbedo.rgb;
    finalDiffuse = max(finalDiffuse, 0.0);
    finalDiffuse *= u_lightingIntensity.x;
    // 环境光照
    vec3 finalAmbient = u_ambientColor;
    finalAmbient *= surfaceAlbedo.rgb;
    // 自发光
    vec3 finalEmissive = u_emissiveColor;

    // 存在自发光贴图时
    #ifdef EMISSIVE_TEXTURE
        vec3 emissiveColorTex = texture(emissiveSampler, v_mainUV1).rgb;
         finalEmissive *= toLinearSpace(emissiveColorTex.rgb);
    #endif

    finalEmissive *= u_lightingIntensity.y;
    // ao
    finalAmbient *= ambientOcclusionColor;
    finalDiffuse *= 1.0;

    vec4 finalColor = vec4(
    finalAmbient +
    finalDiffuse +
    finalIrradiance +
    finalRadianceScaled +
    finalEmissive, alpha);

    finalColor = max(finalColor, 0.0);
    // 转换到gamma
    finalColor = applyImageProcessing(finalColor);
    glFragColor = finalColor;
}