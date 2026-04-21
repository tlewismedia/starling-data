const velocityShader = /* glsl */ `
  uniform float delta;
  uniform float separation_distance;
  uniform float alignment_distance;
  uniform float cohesion_distance;
  uniform float sphere_radius;
  uniform float k_inner;
  uniform float k_outer;

  const float PI = 3.14159;
  const float PI_2 = PI * 2.0;
  const float SPEED_LIMIT = 10.0;

  // Mild ellipsoidal containment — breaks the rotational symmetry that would
  // otherwise turn the flock into a stable single-axis orbit. The pull
  // direction stays radial; only the "am I past the boundary" test is scaled.
  const vec3 RADIUS_SCALE = vec3(1.2, 0.85, 1.0);

  void main() {
    float zoneRadius = separation_distance + alignment_distance + cohesion_distance;
    float zoneRadiusSq = zoneRadius * zoneRadius;
    float separationThresh = separation_distance / zoneRadius;
    float alignmentThresh = (separation_distance + alignment_distance) / zoneRadius;

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 selfPosition = texture2D(texturePosition, uv).xyz;
    vec3 velocity = texture2D(textureVelocity, uv).xyz;

    // --- Ellipsoidal containment toward origin:
    // distance is measured in scaled coords (ellipsoid surface = sphere_radius),
    // but the pull direction stays radial. Gentle pull inside, quadratically
    // stronger past the surface.
    vec3 toCenter = selfPosition;
    float rawDist = length(toCenter);
    float ellipsoidDist = length(toCenter / RADIUS_SCALE);
    if (rawDist > 0.0001) {
      float over = max(ellipsoidDist - sphere_radius, 0.0);
      float pull = k_inner + k_outer * over * over / (sphere_radius * sphere_radius);
      velocity -= (toCenter / rawDist) * pull * delta;
    }

    // --- Reynolds flocking rules across all other boids.
    vec3 dir;
    vec3 neighborVelocity;
    float dist;
    float distSq;
    float percent;
    float f;

    for (float y = 0.0; y < resolution.y; y++) {
      for (float x = 0.0; x < resolution.x; x++) {
        vec2 ref = vec2(x + 0.5, y + 0.5) / resolution.xy;
        vec3 neighborPos = texture2D(texturePosition, ref).xyz;

        dir = neighborPos - selfPosition;
        dist = length(dir);
        if (dist < 0.0001) continue;

        distSq = dist * dist;
        if (distSq > zoneRadiusSq) continue;

        percent = distSq / zoneRadiusSq;

        if (percent < separationThresh) {
          // Rule 1: Separation
          f = (separationThresh / percent - 1.0) * delta;
          velocity -= normalize(dir) * f;
        } else if (percent < alignmentThresh) {
          // Rule 2: Alignment
          float t = (percent - separationThresh) / (alignmentThresh - separationThresh);
          neighborVelocity = texture2D(textureVelocity, ref).xyz;
          f = (0.5 - cos(t * PI_2) * 0.5 + 0.5) * delta;
          velocity += normalize(neighborVelocity) * f;
        } else {
          // Rule 3: Cohesion
          float t = (percent - alignmentThresh) / (1.0 - alignmentThresh);
          f = (0.5 - (cos(t * PI_2) * -0.5 + 0.5)) * delta;
          velocity += normalize(dir) * f;
        }
      }
    }

    if (length(velocity) > SPEED_LIMIT) {
      velocity = normalize(velocity) * SPEED_LIMIT;
    }

    gl_FragColor = vec4(velocity, 1.0);
  }
`

export default velocityShader
