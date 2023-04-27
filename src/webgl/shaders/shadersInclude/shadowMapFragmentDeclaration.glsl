#ifdef SHADOW_MAP
    uniform sampler2D u_shadowMapDepth;
    in vec4 v_positionFromLight;
    in float v_depthMetricSM;
#endif

#ifdef SHADOW_MAP

  #ifdef DEFAULT_SAMPLE
    float ShadowCalculation(vec4 positionFromLight){
      vec3 positionW = positionFromLight.xyz / positionFromLight.w;
      vec3 positionNDC = positionW * 0.5 + 0.5;
      // float currentDepth = positionNDC.z;
      float cloestDepthInMap = texture(u_shadowMapDepth, positionNDC.xy).r;
      float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
      float shadow = currentDepth > cloestDepthInMap  ? 0.0 : 1.0;   
      // 视锥体外保持原有颜色
      if(currentDepth > 1.0 || positionNDC.x < 0.0 || positionNDC.x > 1.0 || positionNDC.y < 0.0 || positionNDC.y > 1.0){
        shadow = 1.0;
      }
      return shadow;
    }
  #endif

  #ifdef POISSON_SAMPLE
    float ShadowCalculationWithPoissonSampling(vec4 positionFromLight){
      vec3 positionW = positionFromLight.xyz / positionFromLight.w;
      vec3 positionNDC = positionW * 0.5 + 0.5;
      float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
      if (positionNDC.x < 0. || positionNDC.x > 1.0 || positionNDC.y < 0. || positionNDC.y > 1.0)
      {
          return 1.0;
      }
      else
      {
          float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
          float visibility = 1.;

          vec2 poissonDisk[4];
          poissonDisk[0] = vec2(-0.94201624, -0.39906216);
          poissonDisk[1] = vec2(0.94558609, -0.76890725);
          poissonDisk[2] = vec2(-0.094184101, -0.92938870);
          poissonDisk[3] = vec2(0.34495938, 0.29387760);
          if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[0] / 1500.0).x < currentDepth) visibility -= 0.25;
          if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[1] / 1500.0).x < currentDepth) visibility -= 0.25;
          if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[2] / 1500.0).x < currentDepth) visibility -= 0.25;
          if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[3] / 1500.0).x < currentDepth) visibility -= 0.25;
          return visibility;
      }
    }
  #endif
#endif