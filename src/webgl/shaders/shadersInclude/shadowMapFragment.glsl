#ifdef SHADOW_MAP
    #ifdef DEFAULT_SAMPLE
    shadow = ShadowCalculation(v_positionFromLight);
    #endif

    #ifdef POISSON_SAMPLE
    shadow = ShadowCalculationWithPoissonSampling(v_positionFromLight);
    #endif

    #ifdef PCF_SAMPLE
    shadow = ShadowCalculationWithPCF5Sampling(v_positionFromLight);
    #endif

    #ifdef PCSS_SAMPLE
    shadow = ShadowCalculationWithPCSSSampling(v_positionFromLight);
    #endif

    #ifdef CASCADED_SHADOW_MAP
        for (int i = 0; i < SHADOWCSMNUM_CASCADES; i++){
            diff0 = u_viewFrustumZ[i]-v_positionFromCamera.z;
            if (diff0 >= 0.) {
                index0 = i;
                break;
            }
        }
        shadow = ShadowCalculationWithCSMPCF5Sampling(float(index0), v_positionFromLight[index0]);
        float frustumLength = u_frustumLengths[index0];
        float diffRatio = clamp(diff0/frustumLength, 0., 1.)*u_cascadeBlendFactor;
        if (index0<(SHADOWCSMNUM_CASCADES-1) && diffRatio<1.) {
            index0 += 1;
            float nextShadow = 0.;
            nextShadow = ShadowCalculationWithCSMPCF5Sampling(float(index0), v_positionFromLight[index0]);
            shadow = mix(nextShadow, shadow, diffRatio);
        }
    #endif
#endif