/* ============================================================================
   Estação B12 — oceano em WebGL
   ----------------------------------------------------------------------------
   Superfície de água animada, desenhada pela placa de vídeo. Sem biblioteca de
   fora (regra Ti Artes: o app não pode depender de outro site para desenhar a
   tela). Se a placa não der conta ou a pessoa pedir menos movimento, cai num
   degradê parado com a mesma cor — nunca fica um buraco branco.

   Uso:  B12.oceano(elemento, { altura:'92px', escuro:false })
   ========================================================================== */
var B12 = window.B12 || {};

(function () {

var VERTICE = [
  'attribute vec2 p;',
  'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
].join('\n');

var FRAGMENTO = [
  'precision mediump float;',
  'uniform vec2  res;',
  'uniform float t;',
  'uniform float escuro;',

  /* ruído barato, suficiente para quebrar a regularidade das senoides */
  'float h(vec2 n){ return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453); }',
  'float ruido(vec2 n){',
  '  vec2 i = floor(n), f = fract(n);',
  '  vec2 u = f*f*(3.0-2.0*f);',
  '  return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y);',
  '}',

  'void main(){',
  '  vec2 uv = gl_FragCoord.xy / res;',
  /* perspectiva falsa: perto da base as ondas são grandes, ao longe ficam finas */
  '  float prof = pow(1.0 - uv.y, 1.8);',
  '  float esc = mix(26.0, 3.2, uv.y);',
  '  float y = uv.y;',

  /* três camadas de onda em direções diferentes */
  '  float o = 0.0;',
  '  o += sin((uv.x * esc) + t * 1.25 + y * 6.0) * 0.5;',
  '  o += sin((uv.x * esc * 1.9) - t * 0.85 + y * 11.0) * 0.28;',
  '  o += sin((uv.x * esc * 0.55) + t * 0.42 - y * 3.0) * 0.34;',
  '  o += (ruido(vec2(uv.x * 9.0, y * 22.0 - t * 0.6)) - 0.5) * 0.55;',
  '  o *= prof * 0.9 + 0.12;',

  /* cor da água: fundo mais escuro embaixo, turquesa clara na direção do horizonte */
  '  vec3 fundo  = mix(vec3(0.020, 0.145, 0.226), vec3(0.008, 0.086, 0.153), escuro);',
  '  vec3 meio   = mix(vec3(0.043, 0.400, 0.400), vec3(0.031, 0.267, 0.290), escuro);',
  '  vec3 claro  = mix(vec3(0.310, 0.780, 0.729), vec3(0.157, 0.502, 0.494), escuro);',
  '  vec3 cor = mix(fundo, meio, smoothstep(0.0, 0.75, uv.y));',
  '  cor = mix(cor, claro, smoothstep(0.55, 1.0, uv.y) * 0.75);',

  /* crista clara onde a onda sobe */
  '  float crista = smoothstep(0.16, 0.46, o);',
  '  cor = mix(cor, claro, crista * 0.55);',

  /* espuma fina só nas cristas mais altas */
  '  float espuma = smoothstep(0.40, 0.52, o) * smoothstep(0.06, 0.42, uv.y);',
  '  cor = mix(cor, vec3(0.88, 0.96, 0.95), espuma * 0.42);',

  /* brilho do sol, uma faixa vertical difusa */
  '  float sol = exp(-pow((uv.x - 0.68) * 2.6, 2.0));',
  '  float lampejo = pow(max(o, 0.0), 2.0) * sol * (0.55 + 0.45 * sin(t * 2.1 + uv.x * 12.0));',
  '  cor += vec3(1.0, 0.94, 0.78) * lampejo * 0.30 * (1.0 - escuro * 0.5);',

  /* escurece as bordas laterais para casar com o resto da tela */
  '  cor *= 1.0 - smoothstep(0.72, 1.0, abs(uv.x - 0.5) * 2.0) * 0.18;',
  '  gl_FragColor = vec4(cor, 1.0);',
  '}'
].join('\n');

function compila(gl, tipo, fonte) {
  var s = gl.createShader(tipo);
  gl.shaderSource(s, fonte); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
  return s;
}

var vivos = [];

B12.oceano = function (alvo, opc) {
  opc = opc || {};
  if (!alvo) return null;
  var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var cv = document.createElement('canvas');
  cv.className = 'oceano';
  cv.setAttribute('aria-hidden', 'true');
  alvo.appendChild(cv);

  var gl = null;
  try { gl = cv.getContext('webgl', { antialias:false, alpha:false, depth:false,
                                      powerPreference:'low-power' })
             || cv.getContext('experimental-webgl'); } catch (e) {}

  /* sem WebGL, ou com movimento reduzido: degradê parado, mesma paleta */
  if (!gl || reduzir) {
    cv.remove();
    alvo.classList.add('oceano-parado');
    return null;
  }

  var vs = compila(gl, gl.VERTEX_SHADER, VERTICE);
  var fs = compila(gl, gl.FRAGMENT_SHADER, FRAGMENTO);
  if (!vs || !fs) { cv.remove(); alvo.classList.add('oceano-parado'); return null; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    cv.remove(); alvo.classList.add('oceano-parado'); return null;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, 'res');
  var uT   = gl.getUniformLocation(prog, 't');
  var uE   = gl.getUniformLocation(prog, 'escuro');
  gl.uniform1f(uE, opc.escuro ? 1.0 : 0.0);

  function medir() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(alvo.clientWidth  * dpr));
    var h = Math.max(1, Math.round(alvo.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) {
      cv.width = w; cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  }
  medir();

  var ativo = true, comeco = performance.now(), anim = 0, visivel = true;

  function quadro(agora) {
    if (!ativo) return;
    anim = requestAnimationFrame(quadro);
    if (!visivel) return;
    medir();
    gl.uniform1f(uT, (agora - comeco) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  anim = requestAnimationFrame(quadro);

  /* não gasta bateria com a aba escondida nem com o elemento fora da tela */
  function vis() { visivel = !document.hidden && dentro; }
  var dentro = true;
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      dentro = es[0].isIntersecting; vis();
    }, { threshold: 0 });
    io.observe(alvo);
  }
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('resize', medir);

  var ref = { parar: function () { ativo = false; cancelAnimationFrame(anim); cv.remove(); } };
  vivos.push(ref);
  return ref;
};

B12.oceanoPararTodos = function () { vivos.forEach(function (o) { o.parar(); }); vivos.length = 0; };

})();
