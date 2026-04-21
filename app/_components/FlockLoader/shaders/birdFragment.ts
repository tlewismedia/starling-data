const birdFragment = /* glsl */ `
  varying float vViewDepth;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogStrength;

  void main() {
    // 0 near the front of the flock, 1 at the far side.
    float fog = smoothstep(fogNear, fogFar, vViewDepth);
    float alpha = 1.0 - fog * fogStrength;
    gl_FragColor = vec4(0.2, 0.2, 0.2, alpha);
  }
`

export default birdFragment
