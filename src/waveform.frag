precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uRotation;     
uniform float uDensity;      
uniform float uThreshold;
uniform vec4 uLineColor;

uniform sampler2D tElias;


varying vec2 vUv;

const float PI = 3.1415926535897932384626433832795;

/*
angle is in radians
*/
vec2 rotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c) * uv;
}

vec2 invRotate(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, s, -s, c) * uv;
}

vec2 rotateCenter(vec2 uv, float angle) {
    return rotate(uv - vec2(.5), uRotation) + vec2(.5);
}

void main() {
    vec2 uvInRotatedSpace = invRotate(vUv, uRotation);

    vec2 targetPixInRot = vec2(floor(uvInRotatedSpace.x * uDensity + 0.5)/uDensity, uvInRotatedSpace.y);

    float distanceFromTargetInRot = abs(targetPixInRot.x - uvInRotatedSpace.x);
    float maxDist = 1.0 / uDensity;

    vec2 targetInCart = invRotate(targetPixInRot, -uRotation);
    vec4 targetColor = texture2D(tElias, targetInCart);

    float targetLum = dot(targetColor.rgb, vec3(0.299, 0.587, 0.114));
    float solidMask = clamp(targetLum, 0.0, uThreshold) < distanceFromTargetInRot * uDensity ? 1.0 : 0.0; // 1.0 is solid; should be shaded. 0.0 should be white space

    vec4 lineColor = uLineColor;

    if (solidMask > 0.5) {
        gl_FragColor = lineColor;
    } else {
        gl_FragColor = vec4(0.0);
    }

}