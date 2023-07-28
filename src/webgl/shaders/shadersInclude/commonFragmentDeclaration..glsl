const float PI = 3.1415926535897932384626433832795;
const float HALF_MIN = 5.96046448e-08;
const float LinearEncodePowerApprox = 2.2;
const float GammaEncodePowerApprox = 1.0/LinearEncodePowerApprox;
const vec3 LuminanceEncodeApprox = vec3(0.2126, 0.7152, 0.0722);
const float Epsilon = 0.0000001;
const float rgbdMaxRange = 255.0;

#define saturate(x) clamp(x, 0.0, 1.0)
#define absEps(x) abs(x)+Epsilon
#define maxEps(x) max(x, Epsilon)
#define saturateEps(x) clamp(x, Epsilon, 1.0)

float toLinearSpace(float color) {
    return pow(color, LinearEncodePowerApprox);
}
vec3 toLinearSpace(vec3 color) {
    return pow(color, vec3(LinearEncodePowerApprox));
}
vec4 toLinearSpace(vec4 color) {
    return vec4(pow(color.rgb, vec3(LinearEncodePowerApprox)), color.a);
}
float toGammaSpace(float color) {
    return pow(color, GammaEncodePowerApprox);
}
vec3 toGammaSpace(vec3 color) {
    return pow(color, vec3(GammaEncodePowerApprox));
}
vec4 toGammaSpace(vec4 color) {
    return vec4(pow(color.rgb, vec3(GammaEncodePowerApprox)), color.a);
}

float square(float value) {
    return value*value;
}
vec3 square(vec3 value) {
    return value*value;
}

vec4 toRGBD(vec3 color) {
    float maxRGB = maxEps(max(color.r, max(color.g, color.b)));
    float D = max(rgbdMaxRange/maxRGB, 1.);
    D = clamp(floor(D)/255.0, 0., 1.);
    vec3 rgb = color.rgb*D;
    rgb = toGammaSpace(rgb);
    return vec4(clamp(rgb, 0., 1.), D);
}
vec3 fromRGBD(vec4 rgbd) {
    rgbd.rgb = toLinearSpace(rgbd.rgb);
    return rgbd.rgb/rgbd.a;
}
vec4 applyImageProcessing(vec4 result) {
    result.rgb = toGammaSpace(result.rgb);
    result.rgb = saturate(result.rgb);
    return result;
}