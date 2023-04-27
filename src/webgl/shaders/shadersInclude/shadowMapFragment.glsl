#ifdef SHADOW_MAP
    #ifdef DEFAULT_SAMPLE
    shadow = ShadowCalculation(v_positionFromLight);
    #endif

    #ifdef POISSON_SAMPLE
    shadow = ShadowCalculationWithPoissonSampling(v_positionFromLight);
    #endif
#endif