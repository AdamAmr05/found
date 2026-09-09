import noiseLicense from './shaders/LICENSE?raw'
import simplexNoise from './shaders/simplex2d.glsl?raw'

export const flowFragment = `
/*
${noiseLicense}
*/
precision highp float;
uniform float t;
uniform vec2 r;
uniform vec2 cursor;
uniform float presence;
uniform vec3 amber;
uniform vec3 burnt;
uniform vec3 heat;
${simplexNoise}

void main() {
  vec2 point = (gl_FragCoord.xy - r * 0.5) / max(r.x, r.y);
  vec2 mouse = (cursor - r * 0.5) / max(r.x, r.y);
  vec2 offset = mouse - point;
  // A small local pull replaces the rotational vortex. Zero presence leaves
  // the original idle coordinates and all pigment calculations unchanged.
  float proximity = exp(-dot(offset, offset) * 18.0);
  point += offset * proximity * presence * 0.035;

  float clock = t * 0.16;
  vec2 domain = point * 3.1;
  vec2 current = vec2(
    snoise(domain * 0.72 + vec2(clock, 8.2)),
    snoise(domain * 0.72 + vec2(5.7, -clock * 0.8))
  );
  vec2 transported = domain + current * 0.7;
  float pigment = snoise(transported + vec2(-clock * 0.35, clock * 0.55));
  float folds = snoise(transported * 1.3 + vec2(3.6, clock * 0.45));
  float warmth = smoothstep(-0.65, 0.65, pigment * 0.8 + folds * 0.2);
  float shade = smoothstep(0.1, 0.85, folds - pigment * 0.18);
  vec3 color = mix(heat, amber, warmth * 0.64);
  color = mix(color, burnt, shade * 0.55);
  gl_FragColor = vec4(color, 1.0);
}
`
