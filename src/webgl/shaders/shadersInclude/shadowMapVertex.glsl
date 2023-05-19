#ifdef SHADOW_MAP
    #ifdef CASCADED_SHADOW_MAP
        v_positionFromCamera = u_viewMatrix * u_worldMatrix * vec4(a_position,1.0);
        for (int i = 0; i < SHADOWCSMNUM_CASCADES; i++){
            v_positionFromLight[i] = u_lightMatrix[i] * u_worldMatrix * vec4(a_position,1.0);
            v_depthMetricSM[i] = (v_positionFromLight[i].z + u_depthValue.x) / u_depthValue.y;
        }
    #else
        v_positionFromLight = u_lightProjectionMatrix * u_lightViewMatrix * u_worldMatrix * vec4(a_position,1.0);
        v_depthMetricSM = (v_positionFromLight.z + u_depthValue.x) / u_depthValue.y;
    #endif

#endif