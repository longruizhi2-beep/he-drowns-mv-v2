// Minimal WebGL2 helpers: programs with uniform setters, textures, render targets, a fullscreen triangle.
export function createGL(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 is not available');
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  return gl;
}

const VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Programs compile asynchronously (KHR_parallel_shader_compile when available): nothing is queried until the
// first use(), so the heavy sea shader can compile while fonts, photographs and audio are still loading.
export function program(gl, fs, name = 'prog') {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = mk(gl.VERTEX_SHADER, VS), fsh = mk(gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fsh);
  gl.linkProgram(p);
  let U = null;
  const finish = () => {
    if (U) return;
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      for (const [sh, src] of [[vs, VS], [fsh, fs]]) {
        if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) continue;
        const log = gl.getShaderInfoLog(sh);
        console.error(name + ' shader error\n' + log + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n'));
        throw new Error(name + ': ' + log);
      }
      throw new Error(name + ' link: ' + gl.getProgramInfoLog(p));
    }
    U = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      U[info.name.replace(/\[0\]$/, '')] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
    }
  };
  let unit = 0;
  const set = (key, v) => {
    const u = U[key];
    if (!u) return;
    const l = u.loc;
    switch (u.type) {
      case gl.FLOAT: u.size > 1 ? gl.uniform1fv(l, v) : gl.uniform1f(l, v); break;
      case gl.FLOAT_VEC2: gl.uniform2fv(l, v); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(l, v); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(l, v); break;
      case gl.INT: case gl.BOOL: gl.uniform1i(l, v); break;
      case gl.FLOAT_MAT3: gl.uniformMatrix3fv(l, false, v); break;
      case gl.SAMPLER_2D: gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(l, unit); unit++; break;
      case gl.SAMPLER_2D_ARRAY: gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D_ARRAY, v); gl.uniform1i(l, unit); unit++; break;
      default: break;
    }
  };
  return {
    p,
    // true once the driver has finished compiling and linking (always true without the extension)
    ready() { return !ext || gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR); },
    use(uniforms) {
      finish();
      gl.useProgram(p);
      unit = 0;
      for (const k in uniforms) set(k, uniforms[k]);
    },
  };
}

export function texture(gl, w, h, opts = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  const internal = opts.float ? gl.RGBA16F : gl.RGBA8;
  const type = opts.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
  gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, opts.data || null);
  const f = opts.nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return t;
}

export function target(gl, w, h, opts = {}) {
  const tex = texture(gl, w, h, opts);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fb, w, h };
}

export function uploadCanvas(gl, tex, canvas) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

export function draw(gl, rt) {
  if (rt) { gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fb); gl.viewport(0, 0, rt.w, rt.h); }
  else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
