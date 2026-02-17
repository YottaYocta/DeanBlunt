precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
varying vec2 vUv;

void main()
{
    vec2 uv = vec2(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0);
    float aspect = uResolution.x / uResolution.y;
    vec2 resolution = vec2(uv.x * aspect, uv.y) * 0.5;

    gl_FragColor = vec4(
        vec3((sin(uTime) + 1.0)/2.0),
        1.0
    );
}
