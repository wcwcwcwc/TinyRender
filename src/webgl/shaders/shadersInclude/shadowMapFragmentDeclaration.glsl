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

    vec2 poissonDisk[16];
    poissonDisk[0] = vec2(-0.94201624, -0.39906216);
    poissonDisk[1] = vec2(0.94558609, -0.76890725);
    poissonDisk[2] = vec2(-0.094184101, -0.92938870);
    poissonDisk[3] = vec2(0.34495938, 0.29387760);
    poissonDisk[4] = vec2( -0.91588581, 0.45771432 );
    poissonDisk[5] = vec2( -0.81544232, -0.87912464 );
    poissonDisk[6] = vec2( -0.38277543, 0.27676845 );
    poissonDisk[7] = vec2( 0.97484398, 0.75648379 );
    poissonDisk[8] = vec2( 0.44323325, -0.97511554 );
    poissonDisk[9] = vec2( 0.53742981, -0.47373420 );
    poissonDisk[10] = vec2( -0.26496911, -0.41893023 );
    poissonDisk[11] = vec2( 0.79197514, 0.19090188 ); 
    poissonDisk[12] = vec2( -0.24188840, 0.99706507 );
    poissonDisk[13] = vec2( -0.81409955, 0.91437590 );
    poissonDisk[14] = vec2( 0.19984126, 0.78641367 );
    poissonDisk[15] = vec2( 0.14383161, -0.14100790 ); 

    float random(vec3 seed, int i){
	    vec4 seed4 = vec4(seed,i);
	    float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
	    return fract(sin(dot_product) * 43758.5453);
    }
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
          // // 1500.0 泊松采样半径，过大还是会产生锯齿，过小分带严重
          // if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[0] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[1] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[2] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[3] / 1500.0).x < currentDepth) visibility -= 0.25;
          // return visibility;

          // 随机泊松 没有分带，但噪点很大
          for (int i = 0; i < 4; i++) {
            int index = int(16.0*random(gl_FragCoord.xyy, i)) % 16;
            for (int j = 0; j < 16; j++) {
              if (j == index) {
                  if (texture(u_shadowMapDepth, positionNDC.xy + poissonDisk[j] / 1500.0).x < currentDepth) visibility -= 0.25;
                  break;
              }
            }
          }
          return visibility;
      }
    }
  #endif
#endif