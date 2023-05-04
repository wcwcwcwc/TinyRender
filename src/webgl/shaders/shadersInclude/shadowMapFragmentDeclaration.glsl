#ifdef SHADOW_MAP

    uniform sampler2D u_shadowMap;
    uniform highp sampler2DShadow u_shadowMapDepth;
    uniform vec4 u_shadowMapSizeAndInverse;

    in vec4 v_positionFromLight;
    in float v_depthMetricSM;

#endif


#ifdef SHADOW_MAP

  #ifdef DEFAULT_SAMPLE
    float ShadowCalculation(vec4 positionFromLight){
      vec3 positionW = positionFromLight.xyz / positionFromLight.w;
      vec3 positionNDC = positionW * 0.5 + 0.5;
      // float currentDepth = positionNDC.z;
      float cloestDepthInMap = texture(u_shadowMap, positionNDC.xy).r;
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
          float currentDepth = clamp(v_depthMetricSM, 0., 1.0);
          float visibility = 1.;
          // // 1500.0 泊松采样半径，过大还是会产生锯齿，过小分带严重
          // if (texture(u_shadowMap, positionNDC.xy + poissonDisk[0] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMap, positionNDC.xy + poissonDisk[1] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMap, positionNDC.xy + poissonDisk[2] / 1500.0).x < currentDepth) visibility -= 0.25;
          // if (texture(u_shadowMap, positionNDC.xy + poissonDisk[3] / 1500.0).x < currentDepth) visibility -= 0.25;
          // return visibility;

          // 随机泊松 没有分带，但噪点很大
          for (int i = 0; i < 4; i++) {
            int index = int(16.0*random(gl_FragCoord.xyy, i)) % 16;
            for (int j = 0; j < 16; j++) {
              if (j == index) {
                  if (texture(u_shadowMap, positionNDC.xy + poissonDisk[j] / 1500.0).x < currentDepth) visibility -= 0.25;
                  break;
              }
            }
          }
          return visibility;
      }
    }

  #endif

  #ifdef PCF_SAMPLE
    // http://www.ludicon.com/castano/blog/articles/shadow-mapping-summary-part-1/
    float ShadowCalculationWithPCF5Sampling(vec4 positionFromLight){
      if (v_depthMetricSM > 1.0 || v_depthMetricSM < 0.0) {
          return 1.0;
      }
      else
      {
          vec3 clipSpace = positionFromLight.xyz / positionFromLight.w;
          vec3 uvDepth = vec3(0.5 * clipSpace.xyz + vec3(0.5));

          vec2 uv = uvDepth.xy * u_shadowMapSizeAndInverse.xy;	// uv in texel units
          uv += 0.5;											// offset of half to be in the center of the texel 制造小数位，防止整数uv时不存在小数的情形
          vec2 st = fract(uv);								// how far from the center
          vec2 base_uv = floor(uv) - 0.5;						// texel coord
          base_uv *= u_shadowMapSizeAndInverse.zw;				// move back to uv coords

          // Equation resolved to fit in a 5*5 distribution like 
          //0 1 3 4 3 1 0
          // 计算新的uv偏移量以及对应的权重值 
          vec2 uvw0 = 4. - 3. * st;
          vec2 uvw1 = vec2(7.);
          vec2 uvw2 = 1. + 3. * st;

          vec3 u = vec3((3. - 2. * st.x) / uvw0.x - 2., (3. + st.x) / uvw1.x, st.x / uvw2.x + 2.) * u_shadowMapSizeAndInverse.z;
          vec3 v = vec3((3. - 2. * st.y) / uvw0.y - 2., (3. + st.y) / uvw1.y, st.y / uvw2.y + 2.) * u_shadowMapSizeAndInverse.w;

          float shadow = 0.;
          // u_shadowMapDepth: sampler2DShadow类型，临近四个点双线性插值
          shadow += uvw0.x * uvw0.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[0], v[0]), uvDepth.z));
          shadow += uvw1.x * uvw0.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[1], v[0]), uvDepth.z));
          shadow += uvw2.x * uvw0.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[2], v[0]), uvDepth.z));
          shadow += uvw0.x * uvw1.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[0], v[1]), uvDepth.z));
          shadow += uvw1.x * uvw1.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[1], v[1]), uvDepth.z));
          shadow += uvw2.x * uvw1.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[2], v[1]), uvDepth.z));
          shadow += uvw0.x * uvw2.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[0], v[2]), uvDepth.z));
          shadow += uvw1.x * uvw2.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[1], v[2]), uvDepth.z));
          shadow += uvw2.x * uvw2.y * texture(u_shadowMapDepth, vec3(base_uv.xy + vec2(u[2], v[2]), uvDepth.z));
          shadow = shadow / 144.0;
          return shadow;
      }

     // return 1.0;
    }
  #endif
#endif