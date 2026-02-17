attribute vec2 texcoord;
attribute vec2 position;

varying vec2 vUv;

void main() {
    vUv = vec2(texcoord.x,1.0-texcoord.y);
    gl_Position = vec4(position, 0, 1);
}