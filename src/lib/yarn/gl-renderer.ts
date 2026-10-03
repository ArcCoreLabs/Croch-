import type { OccluderMesh } from "./hook-occluder";
import { FLOATS_PER_VERTEX, tubeIndices } from "./tube";

/**
 * Renderizador WebGL2 del hilo.
 *
 * El hilo es un tubo 3D de verdad: la profundidad se resuelve por píxel, así
 * que en un nudo cada hebra queda por encima o por debajo donde toca, sin
 * costuras. Pasadas por fotograma:
 *
 * 1. Mapa de sombras desde la luz (hilo + aguja).
 * 2. La aguja como volumen invisible (solo profundidad): tapa lo que pasa por
 *    detrás. La aguja visible es el SVG que hay debajo del lienzo.
 * 3. "Fantasma": el hilo que queda detrás de la aguja, muy tenue (el metal
 *    deja intuirlo).
 * 4. Sombra del hilo sobre la aguja.
 * 5. Hilo con luz, hebras torcidas y sombras.
 * 6. Composición con contorno en pantalla: donde la profundidad salta (el
 *    borde del hilo o un tramo que cruza por encima de otro) se dibuja una
 *    línea oscura, así cada cruce se lee como "encima / debajo".
 */

export interface YarnPalette {
  base: readonly [number, number, number];
  active: readonly [number, number, number];
}

export interface TubeGeometry {
  vertices: Float32Array;
  vertexCount: number;
  rings: number;
}

export interface HookPoseGL {
  /** Punta en reposo (origen de las coordenadas locales de la aguja). */
  tip: readonly [number, number];
  pivot: readonly [number, number];
  tx: number;
  ty: number;
  rot: number;
}

export interface RenderOptions {
  outlineWidth: number;
  pitch: number;
  plies: number;
  ghostAlpha: number;
  hookShadow: number;
}

const DEPTH_RANGE = 60;
const LIGHT: [number, number, number] = (() => {
  const v: [number, number, number] = [-0.42, -0.6, 0.68];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2DShadow;
`;

const SHADOW_FN = /* glsl */ `
uniform sampler2DShadow u_shadow;
float shadowAt(vec4 lp) {
  vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0) return 1.0;
  vec2 texel = 1.0 / vec2(textureSize(u_shadow, 0));
  float sum = 0.0;
  for (int i = -2; i <= 2; i++) {
    for (int j = -2; j <= 2; j++) {
      sum += texture(u_shadow, vec3(p.xy + vec2(float(i), float(j)) * texel * 1.3, p.z - 0.0012));
    }
  }
  return sum / 25.0;
}
`;

const TONE_FN = /* glsl */ `
uniform vec3 u_base;
uniform vec3 u_active;
// Mezcla directa base → activo; la luminancia se conserva para que el borde
// del tramo activo no se vea sucio ni blanco.
vec3 toneColor(float t) {
  vec3 c = mix(u_base, u_active, t);
  float k = 4.0 * t * (1.0 - t);
  vec3 luma = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
  return mix(c, luma + (c - luma) * 1.35, k);
}
`;

const DEPTH_VS = `${COMMON}
layout(location = 0) in vec3 a_pos;
uniform mat4 u_mvp;
void main() { gl_Position = u_mvp * vec4(a_pos, 1.0); }
`;

const DEPTH_FS = `${COMMON}
out vec4 o;
void main() { o = vec4(1.0); }
`;

const YARN_VS = `${COMMON}
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec3 a_extra;
uniform mat4 u_proj;
uniform mat4 u_light;
out vec3 v_normal;
out vec3 v_extra;
out vec4 v_lightPos;
void main() {
  v_normal = a_normal;
  v_extra = a_extra;
  v_lightPos = u_light * vec4(a_pos + a_normal * 0.45, 1.0);
  gl_Position = u_proj * vec4(a_pos, 1.0);
}
`;

const YARN_FS = `${COMMON}
${SHADOW_FN}
${TONE_FN}
uniform vec3 u_lightDir;
uniform float u_pitch;
uniform float u_plies;
in vec3 v_normal;
in vec3 v_extra;
in vec4 v_lightPos;
out vec4 o;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec3 n = normalize(v_normal);
  float s = v_extra.x;
  float theta = v_extra.y;
  float tone = v_extra.z;
  // Hebras torcidas: franjas en hélice ancladas al material.
  float f = fract(s / u_pitch + theta * u_plies / 6.2831853);
  float ply = sin(3.14159265 * f);
  float crown = smoothstep(0.0, 0.55, ply);
  // Fibras: variación fina a lo largo de cada hebra.
  float fiber = 0.93 + 0.07 * hash(floor(s * 3.1 + theta * 4.0));
  float wrap = max(0.0, (dot(n, u_lightDir) + 0.3) / 1.3);
  float shadow = shadowAt(v_lightPos);
  float rim = smoothstep(-0.2, 0.55, n.z);
  vec3 base = toneColor(tone);
  float light = 0.42 + 0.9 * wrap * mix(0.35, 1.0, shadow);
  vec3 color = base * light * mix(0.66, 1.0, crown) * mix(0.68, 1.0, rim) * fiber;
  vec3 h = normalize(u_lightDir + vec3(0.0, 0.0, 1.0));
  float sheen = pow(max(dot(n, h), 0.0), 18.0) * 0.3 * crown * shadow;
  // Luz de relleno fría desde abajo-derecha: separa el volumen del fondo.
  float fill = max(0.0, dot(n, normalize(vec3(0.6, 0.7, 0.3)))) * 0.12;
  o = vec4(color + sheen * mix(vec3(1.0), base, 0.25) + fill * base, 1.0);
}
`;

const COMPOSITE_VS = `${COMMON}
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * Composición + contorno en pantalla: donde la profundidad salta (un tramo
 * delante de otro, o el hilo contra el fondo) se dibuja una línea oscura del
 * color del tramo de delante. Funciona igual en curvas cerradas y cruces.
 */
const COMPOSITE_FS = `${COMMON}
uniform sampler2D u_color;
uniform highp sampler2D u_depth;
uniform vec2 u_texel;
uniform float u_radius;
uniform float u_threshold;
in vec2 v_uv;
out vec4 o;

float worldZ(float d) { return ${DEPTH_RANGE.toFixed(1)} - ${(2 * DEPTH_RANGE).toFixed(1)} * d; }
bool isYarn(vec4 c, float d) { return c.a > 0.98 && d < 0.9999; }

void main() {
  vec4 col = texture(u_color, v_uv);
  float d = texture(u_depth, v_uv).r;
  bool yarn = isYarn(col, d);
  float zc = worldZ(d);
  float inner = 0.0;
  float outer = 0.0;
  vec3 outerColor = vec3(0.0);
  float outerZ = -1e9;
  for (int k = 0; k < 12; k++) {
    float a = float(k) * 0.5235988;
    vec2 dir = vec2(cos(a), sin(a)) * u_texel;
    for (int ring = 1; ring <= 2; ring++) {
      float r = u_radius * (ring == 1 ? 0.55 : 1.0);
      float w = ring == 1 ? 1.0 : 0.55;
      vec2 uv = v_uv + dir * r;
      float nd = texture(u_depth, uv).r;
      if (yarn) {
        // Vecino claramente detrás (otro tramo o la aguja): borde interior.
        if (nd < 0.9999 && zc - worldZ(nd) > u_threshold) inner = max(inner, w);
      } else if (nd < 0.9999) {
        vec4 nc = texture(u_color, uv);
        if (isYarn(nc, nd)) {
          float nz = worldZ(nd);
          if (d >= 0.9999 || nz - zc > u_threshold) {
            outer = max(outer, w);
            if (nz > outerZ) {
              outerZ = nz;
              outerColor = nc.rgb;
            }
          }
        }
      }
    }
  }
  if (yarn) {
    o = vec4(mix(col.rgb, col.rgb * 0.2, inner), 1.0);
  } else if (outer > 0.0) {
    o = vec4(outerColor * 0.2, 1.0) * outer + col * (1.0 - outer);
  } else {
    o = col;
  }
}
`;

const GHOST_FS = `${COMMON}
${TONE_FN}
uniform float u_alpha;
in vec3 v_normal;
in vec3 v_extra;
in vec4 v_lightPos;
out vec4 o;
void main() {
  vec3 c = toneColor(v_extra.z) * (0.75 + 0.25 * normalize(v_normal).z);
  o = vec4(c * u_alpha, u_alpha);
}
`;

const CATCHER_VS = `${COMMON}
layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_normal;
uniform mat4 u_model;
uniform mat4 u_proj;
uniform mat4 u_light;
out vec4 v_lightPos;
void main() {
  vec4 world = u_model * vec4(a_pos, 1.0);
  vec3 normal = normalize(mat3(u_model) * a_normal);
  v_lightPos = u_light * vec4(world.xyz + normal * 0.8, 1.0);
  gl_Position = u_proj * world;
}
`;

const CATCHER_FS = `${COMMON}
${SHADOW_FN}
uniform float u_strength;
in vec4 v_lightPos;
out vec4 o;
void main() {
  float a = (1.0 - shadowAt(v_lightPos)) * u_strength;
  o = vec4(0.0, 0.0, 0.0, a);
}
`;

type Mat4 = Float32Array;

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/** Proyección ortográfica del viewBox: y hacia abajo, z hacia quien mira. */
function viewProjection(viewBox: readonly [number, number, number, number]): Mat4 {
  const [minX, minY, width, height] = viewBox;
  const m = new Float32Array(16);
  m[0] = 2 / width;
  m[5] = -2 / height;
  m[10] = -1 / DEPTH_RANGE;
  m[12] = -1 - (2 * minX) / width;
  m[13] = 1 + (2 * minY) / height;
  m[15] = 1;
  return m;
}

/** Cámara ortográfica de la luz que abarca la escena. */
function lightProjection(viewBox: readonly [number, number, number, number]): Mat4 {
  const f: [number, number, number] = [-LIGHT[0], -LIGHT[1], -LIGHT[2]];
  const upGuess: [number, number, number] = [0, -1, 0];
  const right: [number, number, number] = [
    f[1] * upGuess[2] - f[2] * upGuess[1],
    f[2] * upGuess[0] - f[0] * upGuess[2],
    f[0] * upGuess[1] - f[1] * upGuess[0],
  ];
  const rl = Math.hypot(...right);
  right[0] /= rl;
  right[1] /= rl;
  right[2] /= rl;
  const up: [number, number, number] = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ];
  const [minX, minY, width, height] = viewBox;
  const margin = 40;
  const bounds = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
  for (const x of [minX - margin, minX + width + margin]) {
    for (const y of [minY - margin, minY + height + margin]) {
      for (const z of [-DEPTH_RANGE / 2, DEPTH_RANGE / 2]) {
        const a = x * right[0] + y * right[1] + z * right[2];
        const b = x * up[0] + y * up[1] + z * up[2];
        const c = x * f[0] + y * f[1] + z * f[2];
        bounds[0] = Math.min(bounds[0], a);
        bounds[1] = Math.max(bounds[1], a);
        bounds[2] = Math.min(bounds[2], b);
        bounds[3] = Math.max(bounds[3], b);
        bounds[4] = Math.min(bounds[4], c);
        bounds[5] = Math.max(bounds[5], c);
      }
    }
  }
  const sx = 2 / (bounds[1] - bounds[0]);
  const sy = 2 / (bounds[3] - bounds[2]);
  const sz = 2 / (bounds[5] - bounds[4]);
  const ox = -(bounds[1] + bounds[0]) / (bounds[1] - bounds[0]);
  const oy = -(bounds[3] + bounds[2]) / (bounds[3] - bounds[2]);
  const oz = -(bounds[5] + bounds[4]) / (bounds[5] - bounds[4]);
  const m = new Float32Array(16);
  // Columna j = coeficiente de la coordenada j del mundo.
  for (let j = 0; j < 3; j++) {
    m[j * 4 + 0] = right[j] * sx;
    m[j * 4 + 1] = up[j] * sy;
    m[j * 4 + 2] = f[j] * sz;
  }
  m[12] = ox;
  m[13] = oy;
  m[14] = oz;
  m[15] = 1;
  return m;
}

/** Matriz de la aguja: coordenadas locales (origen en la punta en reposo) → mundo. */
function hookModel(pose: HookPoseGL): Mat4 {
  const a = (pose.rot * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const [px, py] = pose.pivot;
  const [tx0, ty0] = pose.tip;
  // world = R (local + tip - pivot) + pivot + t
  const ox = tx0 - px;
  const oy = ty0 - py;
  const m = new Float32Array(16);
  m[0] = cos;
  m[1] = sin;
  m[4] = -sin;
  m[5] = cos;
  m[10] = 1;
  m[12] = cos * ox - sin * oy + px + pose.tx;
  m[13] = sin * ox + cos * oy + py + pose.ty;
  m[15] = 1;
  return m;
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const program = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader: ${gl.getShaderInfoLog(shader)}`);
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Programa: ${gl.getProgramInfoLog(program)}`);
  return program;
}

interface StrandBuffers {
  vao: WebGLVertexArrayObject;
  depthVao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  rings: number;
  indexCount: number;
  capacity: number;
}

const SHADOW_SIZE = 2048;

export class YarnRenderer {
  readonly gl: WebGL2RenderingContext;
  private programs: Record<"depth" | "yarn" | "composite" | "ghost" | "catcher", WebGLProgram>;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  private strands: StrandBuffers[] = [];
  private shadowFbo: WebGLFramebuffer;
  private shadowTex: WebGLTexture;
  private sceneFbo: WebGLFramebuffer | null = null;
  private sceneColor: WebGLTexture | null = null;
  private sceneDepth: WebGLTexture | null = null;
  private sceneSize: [number, number] = [0, 0];
  private emptyVao: WebGLVertexArrayObject;
  private occluder: { vao: WebGLVertexArrayObject; count: number } | null = null;
  private viewBox: readonly [number, number, number, number] = [0, 0, 1, 1];
  private proj: Mat4 = new Float32Array(16);
  private light: Mat4 = new Float32Array(16);

  static isSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return !!canvas.getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor(
    canvas: HTMLCanvasElement,
    private palette: YarnPalette,
    private options: RenderOptions,
  ) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl || gl.isContextLost()) throw new Error("WebGL2 no disponible");
    this.gl = gl;
    this.programs = {
      depth: compile(gl, DEPTH_VS, DEPTH_FS),
      yarn: compile(gl, YARN_VS, YARN_FS),
      composite: compile(gl, COMPOSITE_VS, COMPOSITE_FS),
      ghost: compile(gl, YARN_VS, GHOST_FS),
      catcher: compile(gl, CATCHER_VS, CATCHER_FS),
    };

    this.shadowTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.emptyVao = gl.createVertexArray()!;
  }

  private uniform(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    let map = this.uniforms.get(program);
    if (!map) {
      map = new Map();
      this.uniforms.set(program, map);
    }
    if (!map.has(name)) map.set(name, this.gl.getUniformLocation(program, name));
    return map.get(name) ?? null;
  }

  setViewBox(viewBox: readonly [number, number, number, number]) {
    this.viewBox = viewBox;
    this.proj = viewProjection(viewBox);
    this.light = lightProjection(viewBox);
  }

  /**
   * Tamaño del lienzo en píxeles reales. `supersample` > 1 dibuja la escena a
   * más resolución y la reduce al componer (antialiasing en pantallas de 1×).
   */
  setSize(width: number, height: number, supersample = 1) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const sw = Math.max(1, Math.round(width * supersample));
    const sh = Math.max(1, Math.round(height * supersample));
    if (this.sceneFbo && this.sceneSize[0] === sw && this.sceneSize[1] === sh) return;
    if (this.sceneColor) gl.deleteTexture(this.sceneColor);
    if (this.sceneDepth) gl.deleteTexture(this.sceneDepth);
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    this.sceneColor = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneColor);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, sw, sh);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sceneDepth = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneDepth);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, sw, sh);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.sceneFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneColor, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.sceneDepth, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.sceneSize = [sw, sh];
  }

  setOccluder(mesh: OccluderMesh | null) {
    const gl = this.gl;
    if (!mesh) {
      this.occluder = null;
      return;
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.occluder = { vao, count: mesh.indices.length };
  }

  private ensureStrand(index: number, geometry: TubeGeometry): StrandBuffers {
    const gl = this.gl;
    let buffers = this.strands[index];
    const needed = geometry.vertexCount * FLOATS_PER_VERTEX;
    if (!buffers) {
      const vao = gl.createVertexArray()!;
      const depthVao = gl.createVertexArray()!;
      const vbo = gl.createBuffer()!;
      const ibo = gl.createBuffer()!;
      buffers = { vao, depthVao, vbo, ibo, rings: 0, indexCount: 0, capacity: 0 };
      this.strands[index] = buffers;
      for (const [target, full] of [
        [vao, true],
        [depthVao, false],
      ] as const) {
        gl.bindVertexArray(target);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const stride = FLOATS_PER_VERTEX * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        if (full) {
          gl.enableVertexAttribArray(1);
          gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
          gl.enableVertexAttribArray(2);
          gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 24);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      }
      gl.bindVertexArray(null);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vbo);
    if (buffers.capacity < needed) {
      gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices.subarray(0, needed), gl.DYNAMIC_DRAW);
      buffers.capacity = needed;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, geometry.vertices, 0, needed);
    }
    if (buffers.rings !== geometry.rings) {
      const indices = tubeIndices(geometry.rings);
      gl.bindVertexArray(buffers.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      gl.bindVertexArray(null);
      buffers.rings = geometry.rings;
      buffers.indexCount = indices.length;
    }
    return buffers;
  }

  private setPalette(program: WebGLProgram) {
    const gl = this.gl;
    const p = this.palette;
    gl.uniform3fv(this.uniform(program, "u_base"), p.base);
    gl.uniform3fv(this.uniform(program, "u_active"), p.active);
  }

  render(tubes: readonly TubeGeometry[], hook: HookPoseGL | null) {
    const gl = this.gl;
    const buffers = tubes.map((tube, i) => this.ensureStrand(i, tube));
    const model = hook ? hookModel(hook) : null;
    const occluder = hook ? this.occluder : null;

    // 1) Mapa de sombras.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const depth = this.programs.depth;
    gl.useProgram(depth);
    gl.uniformMatrix4fv(this.uniform(depth, "u_mvp"), false, this.light);
    for (const b of buffers) {
      gl.bindVertexArray(b.depthVao);
      gl.drawElements(gl.TRIANGLES, b.indexCount, gl.UNSIGNED_INT, 0);
    }
    if (occluder && model) {
      gl.uniformMatrix4fv(this.uniform(depth, "u_mvp"), false, multiply(this.light, model));
      gl.bindVertexArray(occluder.vao);
      gl.drawElements(gl.TRIANGLES, occluder.count, gl.UNSIGNED_INT, 0);
    }

    // 2) Escena (fuera de pantalla: color + profundidad para el contorno).
    if (!this.sceneFbo) this.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.viewport(0, 0, this.sceneSize[0], this.sceneSize[1]);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);

    if (occluder && model) {
      // 2a) Aguja invisible: solo profundidad.
      gl.colorMask(false, false, false, false);
      gl.useProgram(depth);
      gl.uniformMatrix4fv(this.uniform(depth, "u_mvp"), false, multiply(this.proj, model));
      gl.bindVertexArray(occluder.vao);
      gl.drawElements(gl.TRIANGLES, occluder.count, gl.UNSIGNED_INT, 0);
      gl.colorMask(true, true, true, true);

      // 2b) Fantasma del hilo detrás de la aguja.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.depthFunc(gl.GREATER);
      const ghost = this.programs.ghost;
      gl.useProgram(ghost);
      gl.uniformMatrix4fv(this.uniform(ghost, "u_proj"), false, this.proj);
      gl.uniformMatrix4fv(this.uniform(ghost, "u_light"), false, this.light);
      gl.uniform1f(this.uniform(ghost, "u_alpha"), this.options.ghostAlpha);
      this.setPalette(ghost);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      for (const b of buffers) {
        gl.bindVertexArray(b.vao);
        gl.drawElements(gl.TRIANGLES, b.indexCount, gl.UNSIGNED_INT, 0);
      }

      // 2c) Sombra del hilo sobre la aguja.
      gl.depthFunc(gl.LEQUAL);
      const catcher = this.programs.catcher;
      gl.useProgram(catcher);
      gl.uniformMatrix4fv(this.uniform(catcher, "u_model"), false, model);
      gl.uniformMatrix4fv(this.uniform(catcher, "u_proj"), false, this.proj);
      gl.uniformMatrix4fv(this.uniform(catcher, "u_light"), false, this.light);
      gl.uniform1i(this.uniform(catcher, "u_shadow"), 0);
      gl.uniform1f(this.uniform(catcher, "u_strength"), this.options.hookShadow);
      gl.bindVertexArray(occluder.vao);
      gl.drawElements(gl.TRIANGLES, occluder.count, gl.UNSIGNED_INT, 0);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }

    // 3) Hilo.
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.depthFunc(gl.LESS);
    const yarn = this.programs.yarn;
    gl.useProgram(yarn);
    gl.uniformMatrix4fv(this.uniform(yarn, "u_proj"), false, this.proj);
    gl.uniformMatrix4fv(this.uniform(yarn, "u_light"), false, this.light);
    gl.uniform1i(this.uniform(yarn, "u_shadow"), 0);
    gl.uniform3fv(this.uniform(yarn, "u_lightDir"), LIGHT);
    gl.uniform1f(this.uniform(yarn, "u_pitch"), this.options.pitch);
    gl.uniform1f(this.uniform(yarn, "u_plies"), this.options.plies);
    this.setPalette(yarn);
    for (const b of buffers) {
      gl.bindVertexArray(b.vao);
      gl.drawElements(gl.TRIANGLES, b.indexCount, gl.UNSIGNED_INT, 0);
    }

    // 4) Composición en el lienzo con contorno en los saltos de profundidad.
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const composite = this.programs.composite;
    gl.useProgram(composite);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneColor);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneDepth);
    gl.uniform1i(this.uniform(composite, "u_color"), 0);
    gl.uniform1i(this.uniform(composite, "u_depth"), 1);
    gl.uniform2f(this.uniform(composite, "u_texel"), 1 / this.sceneSize[0], 1 / this.sceneSize[1]);
    const pixelsPerUnit = this.sceneSize[0] / this.viewBox[2];
    gl.uniform1f(this.uniform(composite, "u_radius"), Math.max(1.5, this.options.outlineWidth * pixelsPerUnit));
    gl.uniform1f(this.uniform(composite, "u_threshold"), 2.2);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
  }

  /**
   * Libera los recursos de GPU. No fuerza la pérdida del contexto: el mismo
   * lienzo puede volver a usarse (React monta los efectos dos veces en desarrollo).
   */
  dispose() {
    const gl = this.gl;
    for (const b of this.strands) {
      gl.deleteVertexArray(b.vao);
      gl.deleteVertexArray(b.depthVao);
      gl.deleteBuffer(b.vbo);
      gl.deleteBuffer(b.ibo);
    }
    this.strands = [];
    if (this.occluder) gl.deleteVertexArray(this.occluder.vao);
    this.occluder = null;
    if (this.sceneColor) gl.deleteTexture(this.sceneColor);
    if (this.sceneDepth) gl.deleteTexture(this.sceneDepth);
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    this.sceneFbo = null;
    gl.deleteTexture(this.shadowTex);
    gl.deleteFramebuffer(this.shadowFbo);
    gl.deleteVertexArray(this.emptyVao);
    for (const program of Object.values(this.programs)) gl.deleteProgram(program);
  }
}
