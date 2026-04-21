const birdVertex = /* glsl */ `
  attribute vec2 reference;
  attribute float birdVertex;

  uniform sampler2D texturePosition;
  uniform sampler2D textureVelocity;

  varying float vViewDepth;

  void main() {
    vec4 tmpPos = texture2D(texturePosition, reference);
    vec3 birdPos = tmpPos.xyz;
    vec3 velocity = normalize(texture2D(textureVelocity, reference).xyz);

    vec3 newPosition = position;

    // Flap the two wingtip vertices (IDs 4 and 7) using .w as phase.
    if (birdVertex == 4.0 || birdVertex == 7.0) {
      newPosition.y = sin(tmpPos.w) * 5.0;
    }

    newPosition = mat3(modelMatrix) * newPosition;

    // Orient each bird along its velocity vector.
    velocity.z *= -1.0;
    float xz = length(velocity.xz);
    float cosry = velocity.x / xz;
    float sinry = velocity.z / xz;

    float cosrz = sqrt(1.0 - velocity.y * velocity.y);
    float sinrz = velocity.y;

    mat3 rotY = mat3(cosry, 0.0, -sinry, 0.0, 1.0, 0.0, sinry, 0.0, cosry);
    mat3 rotZ = mat3(cosrz, sinrz, 0.0, -sinrz, cosrz, 0.0, 0.0, 0.0, 1.0);

    newPosition = rotY * rotZ * newPosition;
    newPosition += birdPos;

    // Distance from camera (positive, in view space) — used by the fragment
    // shader for depth-based occlusion/fade.
    vec4 mvPos = viewMatrix * vec4(newPosition, 1.0);
    vViewDepth = -mvPos.z;

    gl_Position = projectionMatrix * mvPos;
  }
`

export default birdVertex
