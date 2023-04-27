#ifdef SHADOW_MAP
    uniform mat4 u_lightViewMatrix;
    uniform mat4 u_lightProjectionMatrix;
    uniform vec2 u_depthValue;
    out vec4 v_positionFromLight;
    out float v_depthMetricSM;
#endif
