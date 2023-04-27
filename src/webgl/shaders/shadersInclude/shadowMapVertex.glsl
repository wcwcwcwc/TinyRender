#ifdef SHADOW_MAP
    v_positionFromLight = u_lightProjectionMatrix * u_lightViewMatrix * u_worldMatrix * vec4(a_position,1.0);
    v_depthMetricSM = (v_positionFromLight.z + u_depthValue.x) / u_depthValue.y;
#endif