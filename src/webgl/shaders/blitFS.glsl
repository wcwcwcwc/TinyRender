in vec2 v_vUV;
out vec4 outColor;

uniform float u_invertY;
uniform sampler2D u_textureSampler;

void main(void) 
{
    vec2 uv = v_vUV;
    if (u_invertY == 1.0) {
        uv.y = 1.0 - uv.y;
    }

    outColor = texture(u_textureSampler, uv);
}