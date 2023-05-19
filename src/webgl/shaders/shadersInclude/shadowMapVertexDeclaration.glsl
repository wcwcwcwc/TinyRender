#ifdef SHADOW_MAP
    uniform mat4 u_lightViewMatrix;
    uniform mat4 u_lightProjectionMatrix;
    uniform vec2 u_depthValue;

    #ifdef CASCADED_SHADOW_MAP
        uniform mat4 u_lightMatrix[SHADOWCSMNUM_CASCADES];
        out vec4 v_positionFromLight[SHADOWCSMNUM_CASCADES];
        out float v_depthMetricSM[SHADOWCSMNUM_CASCADES];
        out vec4 v_positionFromCamera;
    #else
        out vec4 v_positionFromLight;
        out float v_depthMetricSM;
    #endif

#endif
