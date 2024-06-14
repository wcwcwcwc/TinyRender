#ifdef LIGHT
    uniform vec3 u_lightColor;
    uniform vec3 u_lightPosition;
    uniform vec3 u_lightDirection;

    
    struct preLightingInfo {
        vec3 lightOffset;
        float lightDistanceSquared;
        float lightDistance;
        float attenuation;
        vec3 L;
        vec3 H;
        float NdotV;
        float NdotLUnclamped;
        float NdotL;
        float VdotH;
        float roughness;
    };

    struct lightingInfo {
        vec3 diffuse;
        vec3 specular;
    };

    preLightingInfo computeDirectionalPreLightingInfo(vec4 lightDirection, vec3 V, vec3 N) {
        preLightingInfo result;
        result.lightDistance = length(-lightDirection.xyz);
        result.L = normalize(-lightDirection.xyz);
        result.H = normalize(V+result.L);
        result.VdotH = saturate(dot(V, result.H));
        result.NdotLUnclamped = dot(N, result.L);
        result.NdotL = saturateEps(result.NdotLUnclamped);
        return result;
    }
#endif
