#ifdef SHADOW_MAP

    uniform sampler2D u_shadowMap;
    uniform highp sampler2DShadow u_shadowMapDepth;
    uniform vec4 u_shadowMapSizeAndInverse;
    
    #ifdef PCSS_SAMPLE
    uniform float u_lightSizeUV;
    #endif

    in vec4 v_positionFromLight;
    in float v_depthMetricSM;

#endif


#ifdef SHADOW_MAP

  float random(vec3 seed, int i){
    vec4 seed4 = vec4(seed,i);
    float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
    return fract(sin(dot_product) * 43758.5453);
  }

  float getRand(vec2 seed) {
    return fract(sin(dot(seed.xy, vec2(12.9898, 78.233)))*43758.5453);
  }

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

  #ifdef PCSS_SAMPLE
      const vec3 PoissonSamplers32[64] = vec3[64](
        vec3(0.06407013, 0.05409927, 0.),
        vec3(0.7366577, 0.5789394, 0.),
        vec3(-0.6270542, -0.5320278, 0.),
        vec3(-0.4096107, 0.8411095, 0.),
        vec3(0.6849564, -0.4990818, 0.),
        vec3(-0.874181, -0.04579735, 0.),
        vec3(0.9989998, 0.0009880066, 0.),
        vec3(-0.004920578, -0.9151649, 0.),
        vec3(0.1805763, 0.9747483, 0.),
        vec3(-0.2138451, 0.2635818, 0.),
        vec3(0.109845, 0.3884785, 0.),
        vec3(0.06876755, -0.3581074, 0.),
        vec3(0.374073, -0.7661266, 0.),
        vec3(0.3079132, -0.1216763, 0.),
        vec3(-0.3794335, -0.8271583, 0.),
        vec3(-0.203878, -0.07715034, 0.),
        vec3(0.5912697, 0.1469799, 0.),
        vec3(-0.88069, 0.3031784, 0.),
        vec3(0.5040108, 0.8283722, 0.),
        vec3(-0.5844124, 0.5494877, 0.),
        vec3(0.6017799, -0.1726654, 0.),
        vec3(-0.5554981, 0.1559997, 0.),
        vec3(-0.3016369, -0.3900928, 0.),
        vec3(-0.5550632, -0.1723762, 0.),
        vec3(0.925029, 0.2995041, 0.),
        vec3(-0.2473137, 0.5538505, 0.),
        vec3(0.9183037, -0.2862392, 0.),
        vec3(0.2469421, 0.6718712, 0.),
        vec3(0.3916397, -0.4328209, 0.),
        vec3(-0.03576927, -0.6220032, 0.),
        vec3(-0.04661255, 0.7995201, 0.),
        vec3(0.4402924, 0.3640312, 0.),

        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.),
        vec3(0., 0., 0.)
    );

    const vec3 PoissonSamplers64[64] = vec3[64](
        vec3(-0.613392, 0.617481, 0.),
        vec3(0.170019, -0.040254, 0.),
        vec3(-0.299417, 0.791925, 0.),
        vec3(0.645680, 0.493210, 0.),
        vec3(-0.651784, 0.717887, 0.),
        vec3(0.421003, 0.027070, 0.),
        vec3(-0.817194, -0.271096, 0.),
        vec3(-0.705374, -0.668203, 0.),
        vec3(0.977050, -0.108615, 0.),
        vec3(0.063326, 0.142369, 0.),
        vec3(0.203528, 0.214331, 0.),
        vec3(-0.667531, 0.326090, 0.),
        vec3(-0.098422, -0.295755, 0.),
        vec3(-0.885922, 0.215369, 0.),
        vec3(0.566637, 0.605213, 0.),
        vec3(0.039766, -0.396100, 0.),
        vec3(0.751946, 0.453352, 0.),
        vec3(0.078707, -0.715323, 0.),
        vec3(-0.075838, -0.529344, 0.),
        vec3(0.724479, -0.580798, 0.),
        vec3(0.222999, -0.215125, 0.),
        vec3(-0.467574, -0.405438, 0.),
        vec3(-0.248268, -0.814753, 0.),
        vec3(0.354411, -0.887570, 0.),
        vec3(0.175817, 0.382366, 0.),
        vec3(0.487472, -0.063082, 0.),
        vec3(-0.084078, 0.898312, 0.),
        vec3(0.488876, -0.783441, 0.),
        vec3(0.470016, 0.217933, 0.),
        vec3(-0.696890, -0.549791, 0.),
        vec3(-0.149693, 0.605762, 0.),
        vec3(0.034211, 0.979980, 0.),
        vec3(0.503098, -0.308878, 0.),
        vec3(-0.016205, -0.872921, 0.),
        vec3(0.385784, -0.393902, 0.),
        vec3(-0.146886, -0.859249, 0.),
        vec3(0.643361, 0.164098, 0.),
        vec3(0.634388, -0.049471, 0.),
        vec3(-0.688894, 0.007843, 0.),
        vec3(0.464034, -0.188818, 0.),
        vec3(-0.440840, 0.137486, 0.),
        vec3(0.364483, 0.511704, 0.),
        vec3(0.034028, 0.325968, 0.),
        vec3(0.099094, -0.308023, 0.),
        vec3(0.693960, -0.366253, 0.),
        vec3(0.678884, -0.204688, 0.),
        vec3(0.001801, 0.780328, 0.),
        vec3(0.145177, -0.898984, 0.),
        vec3(0.062655, -0.611866, 0.),
        vec3(0.315226, -0.604297, 0.),
        vec3(-0.780145, 0.486251, 0.),
        vec3(-0.371868, 0.882138, 0.),
        vec3(0.200476, 0.494430, 0.),
        vec3(-0.494552, -0.711051, 0.),
        vec3(0.612476, 0.705252, 0.),
        vec3(-0.578845, -0.768792, 0.),
        vec3(-0.772454, -0.090976, 0.),
        vec3(0.504440, 0.372295, 0.),
        vec3(0.155736, 0.065157, 0.),
        vec3(0.391522, 0.849605, 0.),
        vec3(-0.620106, -0.328104, 0.),
        vec3(0.789239, -0.419965, 0.),
        vec3(-0.545396, 0.538133, 0.),
        vec3(-0.178564, -0.596057, 0.)
    );

    float ShadowCalculationWithPCSSSampling(vec4 positionFromLight){
      if (v_depthMetricSM > 1.0 || v_depthMetricSM < 0.0) {
          return 1.0;
      }
      else
      {
          vec3 clipSpace = positionFromLight.xyz / positionFromLight.w;
          vec3 uvDepth = vec3(0.5 * clipSpace.xyz + vec3(0.5));
          float blockerDepth = 0.0;
          float sumBlockerDepth = 0.0;
          float numBlocker = 0.0;
          for (int i = 0;i<32;i ++) {
            blockerDepth = texture(u_shadowMap, uvDepth.xy+(u_lightSizeUV*u_shadowMapSizeAndInverse.z*PoissonSamplers32[i].xy), 0.).r;
            if (blockerDepth < v_depthMetricSM) {
                sumBlockerDepth += blockerDepth;
                numBlocker++;
            }
          }
          if (numBlocker < 1.0) {
            return 1.0;
          }
          else
          {
            float avgBlockerDepth = sumBlockerDepth / numBlocker;

            // Offset preventing aliasing on contact.
            float AAOffset = u_shadowMapSizeAndInverse.z * 50.;
            // Do not dividing by z despite being physically incorrect looks better due to the limited kernel size.
            float penumbraRatio = (v_depthMetricSM - avgBlockerDepth) / avgBlockerDepth;
            // float penumbraRatio = ((v_depthMetricSM - avgBlockerDepth) + AAOffset);
            float filterRadius = penumbraRatio * u_lightSizeUV * u_shadowMapSizeAndInverse.z;

            float random = getRand(positionFromLight.xy);
            float rotationAngle = random * 3.1415926;
            vec2 rotationVector = vec2(cos(rotationAngle), sin(rotationAngle));

            float shadow = 0.;
            for (int i = 0; i < 64; i++) {
                vec3 offset = PoissonSamplers64[i];
                // Rotated offset.
                offset = vec3(offset.x * rotationVector.x - offset.y * rotationVector.y, offset.y * rotationVector.x + offset.x * rotationVector.y, 0.);
                float currentDepth = texture(u_shadowMap, uvDepth.xy + offset.xy * filterRadius).r;
                float sm = v_depthMetricSM > currentDepth  ? 0.0 : 1.0;   
                shadow += sm;
                // shadow += texture(u_shadowMapDepth, uvDepth + offset * filterRadius);
            }
            shadow /= float(64);

            // Blocker distance falloff
            // shadow = mix(shadow, 1., v_depthMetricSM - avgBlockerDepth);

            return shadow;
          }
      }
      // return 1.0;
    }
  #endif
#endif