
in float v_depthMetricSM;
out vec4 outColor;

void main() {
    float depthSM = v_depthMetricSM;
  outColor = vec4(depthSM, 1.0, 1.0, 1.0);
}