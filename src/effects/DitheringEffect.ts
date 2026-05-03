import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragment = /* glsl */ `
  uniform float pixelSize;
  uniform float threshold;
  uniform float darkness;
  uniform float brightness;
  uniform float invert;
  uniform vec2  hoverPoint;     // in 0..1 UV, off-canvas when mouse is outside
  uniform float hoverRadius;    // size of the disturbed zone in UV units
  uniform float hoverStrength;  // radial push amount
  uniform float hoverScatter;   // per-cell random jitter intensity
  uniform float hoverActivity;  // 0..1 — modulated by mouse speed for spring-back

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  vec2 hash22(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(17.31, 4.07)));
  }

  float bayer(int x, int y) {
    int i = y * 8 + x;
    if (i ==  0) return  0.0; if (i ==  1) return 32.0; if (i ==  2) return  8.0; if (i ==  3) return 40.0;
    if (i ==  4) return  2.0; if (i ==  5) return 34.0; if (i ==  6) return 10.0; if (i ==  7) return 42.0;
    if (i ==  8) return 48.0; if (i ==  9) return 16.0; if (i == 10) return 56.0; if (i == 11) return 24.0;
    if (i == 12) return 50.0; if (i == 13) return 18.0; if (i == 14) return 58.0; if (i == 15) return 26.0;
    if (i == 16) return 12.0; if (i == 17) return 44.0; if (i == 18) return  4.0; if (i == 19) return 36.0;
    if (i == 20) return 14.0; if (i == 21) return 46.0; if (i == 22) return  6.0; if (i == 23) return 38.0;
    if (i == 24) return 60.0; if (i == 25) return 28.0; if (i == 26) return 52.0; if (i == 27) return 20.0;
    if (i == 28) return 62.0; if (i == 29) return 30.0; if (i == 30) return 54.0; if (i == 31) return 22.0;
    if (i == 32) return  3.0; if (i == 33) return 35.0; if (i == 34) return 11.0; if (i == 35) return 43.0;
    if (i == 36) return  1.0; if (i == 37) return 33.0; if (i == 38) return  9.0; if (i == 39) return 41.0;
    if (i == 40) return 51.0; if (i == 41) return 19.0; if (i == 42) return 59.0; if (i == 43) return 27.0;
    if (i == 44) return 49.0; if (i == 45) return 17.0; if (i == 46) return 57.0; if (i == 47) return 25.0;
    if (i == 48) return 15.0; if (i == 49) return 47.0; if (i == 50) return  7.0; if (i == 51) return 39.0;
    if (i == 52) return 13.0; if (i == 53) return 45.0; if (i == 54) return  5.0; if (i == 55) return 37.0;
    if (i == 56) return 63.0; if (i == 57) return 31.0; if (i == 58) return 55.0; if (i == 59) return 23.0;
    if (i == 60) return 61.0; if (i == 61) return 29.0; if (i == 62) return 53.0; return 21.0;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 cellId = floor(uv * resolution / pixelSize);
    vec2 cellCenter = (cellId + 0.5) * pixelSize / resolution;

    vec2 d = cellCenter - hoverPoint;
    float aspect = resolution.x / resolution.y;
    vec2 dAspect = d * vec2(aspect, 1.0);
    float dist = length(dAspect);

    float falloff = 1.0 - smoothstep(0.0, hoverRadius, dist);
    falloff = pow(falloff, 1.6) * hoverActivity;

    vec2 rnd = hash22(cellId) * 2.0 - 1.0;
    vec2 baseDir = normalize(d + rnd * 0.15 + 1e-5);

    vec2 push = baseDir * falloff * hoverStrength;
    push += rnd * falloff * hoverScatter * 0.04;

    vec2 sampleUV = cellCenter - push;
    vec2 pixelCoord = floor(sampleUV * resolution / pixelSize);
    vec2 snappedUV  = (pixelCoord + 0.5) * pixelSize / resolution;
    vec4 src = texture2D(inputBuffer, snappedUV);

    vec3 paper  = vec3(1.0);
    vec3 linear = mix(paper, src.rgb, src.a);

    float lum = dot(linear, vec3(0.2126, 0.7152, 0.0722));
    lum = clamp((lum - darkness) / max(brightness - darkness, 1e-4), 0.0, 1.0);

    int bx = int(mod(pixelCoord.x, 8.0));
    int by = int(mod(pixelCoord.y, 8.0));
    float t = (bayer(bx, by) + 0.5) / 64.0;

    float bit = step(t + (threshold - 0.5), lum);
    bit = mix(bit, 1.0 - bit, invert);

    outputColor = vec4(vec3(bit), 1.0);
  }
`

export interface DitheringEffectOptions {
  pixelSize?: number
  threshold?: number
  darkness?: number
  brightness?: number
  invert?: boolean
  hoverRadius?: number
  hoverStrength?: number
  hoverScatter?: number
}

export class DitheringEffect extends Effect {
  constructor({
    pixelSize = 2,
    threshold = 0.5,
    darkness = 0.0,
    brightness = 1.0,
    invert = false,
    hoverRadius = 0.22,
    hoverStrength = 0.18,
    hoverScatter = 1.0,
  }: DitheringEffectOptions = {}) {
    super('DitheringEffect', fragment, {
      uniforms: new Map<string, Uniform<number | Vector2>>([
        ['pixelSize', new Uniform(pixelSize)],
        ['threshold', new Uniform(threshold)],
        ['darkness', new Uniform(darkness)],
        ['brightness', new Uniform(brightness)],
        ['invert', new Uniform(invert ? 1 : 0)],
        ['hoverPoint', new Uniform(new Vector2(-2, -2))],
        ['hoverRadius', new Uniform(hoverRadius)],
        ['hoverStrength', new Uniform(hoverStrength)],
        ['hoverScatter', new Uniform(hoverScatter)],
        ['hoverActivity', new Uniform(0)],
      ]),
    })
  }

  set pixelSize(v: number) { this.uniforms.get('pixelSize')!.value = v }
  set threshold(v: number) { this.uniforms.get('threshold')!.value = v }
  set darkness(v: number) { this.uniforms.get('darkness')!.value = v }
  set brightness(v: number) { this.uniforms.get('brightness')!.value = v }
  set invert(v: boolean) { this.uniforms.get('invert')!.value = v ? 1 : 0 }
  set hoverRadius(v: number) { this.uniforms.get('hoverRadius')!.value = v }
  set hoverStrength(v: number) { this.uniforms.get('hoverStrength')!.value = v }
  set hoverScatter(v: number) { this.uniforms.get('hoverScatter')!.value = v }
  set hoverActivity(v: number) { this.uniforms.get('hoverActivity')!.value = v }
  get hoverActivity(): number { return this.uniforms.get('hoverActivity')!.value as number }

  get hoverPoint(): Vector2 {
    return this.uniforms.get('hoverPoint')!.value as Vector2
  }
}
