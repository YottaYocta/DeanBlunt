precision highp float;

uniform float uTime;

varying vec2 vUv;

void main() {
    vec2 uv = vec2(vUv.x, vUv.y);
    gl_FragColor = vec4(vec3((sin(uTime) + 1.0)/2.0, 1.0, (cos(uTime) + 1.0) / 2.0), 1.0);
}