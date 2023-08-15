vec3 hemisphereImportanceSampleDggx(vec2 u, float a) {
    // pdf = D(a) * cosTheta
    // 这里要求的是微平面法向量h的pdf，根据法线分布函数D的定义和PDF的性质其积分在区间内等于1：∫ cosθ * D（wh）dwh = 1,即wh的pdf为 cosθ * D（wh）
    float phi = 2.*PI*u.x;
    float cosTheta2 = (1.-u.y)/(1.+(a+1.)*((a-1.)*u.y));
    float cosTheta = sqrt(cosTheta2);
    float sinTheta = sqrt(1.-cosTheta2);
    return vec3(sinTheta*cos(phi), sinTheta*sin(phi), cosTheta);
}
vec3 hemisphereCosSample(vec2 u) {
    // pdf = cosTheta / M_PI;
    float phi = 2.*PI*u.x;
    float cosTheta2 = 1.-u.y;
    float cosTheta = sqrt(cosTheta2);
    float sinTheta = sqrt(1.-cosTheta2);
    return vec3(sinTheta*cos(phi), sinTheta*sin(phi), cosTheta);
}