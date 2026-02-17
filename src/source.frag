precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float sdSphere(vec3 p, float r)
{
    return length(p) - r;
}

float sdCappedCylinder(vec3 p, float h, float r)
{
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdCappedCone( vec3 p, float h, float r1, float r2 )
{
  vec2 q = vec2( length(p.xz), p.y );
  vec2 k1 = vec2(r2,h);
  vec2 k2 = vec2(r2-r1,2.0*h);
  vec2 ca = vec2(q.x-min(q.x,(q.y<0.0)?r1:r2), abs(q.y)-h);
  vec2 cb = q - k1 + k2*clamp( dot(k1-q,k2)/dot(k2, k2), 0.0, 1.0 );
  float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(dot(ca, ca),dot(cb, cb)) );
}

float sdEllipsoid(vec3 p, vec3 r)
{
    return (length(p/r) - 1.0) * min(min(r.x,r.y),r.z);
}

float smin(float a, float b, float k)
{
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

vec3 rotateAroundAxis(vec3 v, vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return v * c +
           cross(axis, v) * s +
           axis * dot(axis, v) * oc;
}

float petals(vec3 p) 
{
    float petals = 1000.0;
    const int PETAL_COUNT = 6;
    for(int i = 0; i < PETAL_COUNT; i++)
    {
        float angle = float(i) / float(PETAL_COUNT) * 6.28318;
        vec3 rp = p;
        
       
        float c = cos(angle);
        float s = sin(angle);
        rp.xz = mat2(c, -s, s, c) * rp.xz;

        float dist_from_center = length(rp.xz) * 7.0;

        // adds dip near stem
        rp.y -= 2.0 / pow(1.3, dist_from_center + abs(rp.x) * 5.0);

        // adds crease along center
        rp.y += smoothstep(-0.9, 0.9, rp.x / 4.0) + 1.0;

        // adds tilt between leaves
        rp.z += 1.0/(abs(rp.x) + 1.5) + 0.5;

        float petal = sdEllipsoid(rp, vec3(0.07, 0.01, 0.1));
        petals = smin(petals, petal, 0.0);
    }
    return petals;
}

float trumpet(vec3 p) 
{
    float dist_from_center = length(p.xz);
    vec3 p_base = p;
    p_base.y +=1.0;
    float trumpetbase = sdCappedCone(p_base, 0.6, 0.3, 0.1);

    vec3 p_flare = p;
    p_flare.y -= 1.0 / (dist_from_center + 0.4) - 3.2;

    float r = length(p_flare.xz);
    float angle = atan(p_flare.z, p_flare.x);


    float hyper = 1.0 / (r + 10.0);


    p_flare.y += hyper * sin(angle * angle);


    float flare = sdEllipsoid(p_flare, vec3(0.09, 0.01, 0.09));
    float trumpet = smin(trumpetbase, flare, 0.6);

    return trumpet;
}

float get_distance_to_scene(vec3 p)
{
    float scaledTime = uTime / 20.0;

    p = rotateAroundAxis(p, vec3(1.0, 0.0, 0.0), sin(scaledTime) / 10.0 - 0.6);
    p = rotateAroundAxis(p, vec3(0.0, 1.0, 0.0), scaledTime);

    p.xz += vec2(sin(p.y * 0.2+ scaledTime), cos(p.y * 0.20 + scaledTime)) * smoothstep(-1.0, 0.0, p.y) / 2.0;

    vec3 stemP = p;
    stemP.y -= 5.0;
    float stem = sdCappedCylinder(stemP, 5.0, 0.01);

    float flower = smin(petals(p), trumpet(p), 0.0);

    float scene = smin(flower, stem, 0.0);

    return scene;
}

void main()
{
    vec2 uv = vec2(vUv.x * 2.0 - 1.0, vUv.y * 2.0 - 1.0);
    float aspect = uResolution.x / uResolution.y;
    vec2 resolution = vec2(uv.x * aspect, uv.y) * 0.5;

    vec3 ray_origin = vec3(0.0, -0.0, -10.0);
    vec3 ray_direction = normalize(vec3(resolution, 1.0));

    float MAX_DIST = 100.0;
    const int MAX_STEPS = 100;
    float dist_traveled = 0.0;
    int steps = 0;
    int intersected = 0;

    for(int i = 0; i < MAX_STEPS; i++)
    {
        vec3 current_pos = ray_origin + ray_direction * dist_traveled;

        float distance = get_distance_to_scene(current_pos);

        if(distance < 0.1)
        {
            intersected = 1;
            break;
        }

        if(dist_traveled > MAX_DIST)
            break;

        dist_traveled += distance * 0.5;
        steps += 1;
    }

    gl_FragColor = vec4(vec3((float(steps) / float(MAX_STEPS)) * float(intersected)), 1.0);
}
