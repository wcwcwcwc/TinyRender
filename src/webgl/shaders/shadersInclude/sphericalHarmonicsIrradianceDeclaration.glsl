#ifdef SPHERICALHARMONICS_ENABLED

    uniform vec3 u_sphericalL0M0;
    uniform vec3 u_sphericalL1M_1;
    uniform vec3 u_sphericalL1M0;
    uniform vec3 u_sphericalL1M1;
    uniform vec3 u_sphericalL2M_2;
    uniform vec3 u_sphericalL2M_1;
    uniform vec3 u_sphericalL2M0;
    uniform vec3 u_sphericalL2M1;
    uniform vec3 u_sphericalL2M2;

    vec3 computeSHIrradiance(vec3 normal) {
        return u_sphericalL0M0

            + u_sphericalL1M_1 * (normal.y)
            + u_sphericalL1M0 * (normal.z)
            + u_sphericalL1M1 * (normal.x)

            + u_sphericalL2M_2 * (normal.y * normal.x)
            + u_sphericalL2M_1 * (normal.y * normal.z)
            + u_sphericalL2M0 * ((3.0 * normal.z * normal.z) - 1.0)
            + u_sphericalL2M1 * (normal.z * normal.x)
            + u_sphericalL2M2 * (normal.x * normal.x - (normal.y * normal.y));
    }

#endif