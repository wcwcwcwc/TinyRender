
in float v_depthMetricSM;
in vec2 v_mainUV1;
out vec4 outColor;

void main() {
    float depthSM = v_depthMetricSM;
  outColor = vec4(depthSM, 1.0, 1.0, 1.0);
}