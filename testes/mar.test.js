/* ============================================================================
   Estado do mar e força do vento — rodar com: node testes/mar.test.js

   Por que isto tem teste: até 15/10/2026 o app dizia "Mar: Calmo" olhando o
   VENTO local, não a ONDA. Marulho de 2 metros chega de um ciclone a mil
   quilômetros, com vento fraco na praia — pelo vento o app diria "calmo" e o
   mar estaria grosso. Num app de travessia com passageiro, isso não é
   detalhe de tela.

   As escalas são as que a Marinha usa nos avisos (Douglas para o mar,
   Beaufort para o vento), para o app falar a mesma língua do aviso oficial.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

let ok = 0, falhou = 0;
function eh(nome, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHOU ' + nome + (extra ? '  →  ' + extra : '')); }
}

/* carrega turista.js num mundo de mentira, só para pegar as funções puras */
const janela = {
  document: { addEventListener(){}, querySelector: () => null,
              querySelectorAll: () => [], getElementById: () => null },
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  setTimeout, clearTimeout, console,
  fetch: () => Promise.resolve({ json: async () => ({}) }),
  AbortController: class { constructor(){ this.signal = {}; } abort(){} },
  matchMedia: () => ({ matches: false }),
  navigator: { userAgent: 'node' },
  location: { href: '', hash: '' },
};
janela.window = janela;
janela.addEventListener = function(){};
janela.B12 = {
  EMPRESA: { lat: -25.566233, lon: -48.356609, whats: '55', nome: 'B12', endereco: 'x', cep: 'y' },
  DB: { ajustes: { tabela: { dia:{de:'08h30',ate:'18h00'}, tarde:{de:'18h00',ate:'20h00'},
        noite:{de:'20h00',ate:'22h00'} }, idadeCortesia: 5 } },
  PARCEIROS: [], PASSEIOS: [], LUGARES: [], COMER: [], FICAR: [], FAZER: [], DICAS: [],
  CREDITOS: [], DESTINOS: [], SOBRE: {}, NUVEM: {},
};
const ctx = vm.createContext(janela);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'turista.js'), 'utf8'), ctx);
const B12 = janela.B12;

console.log('\n— o mar sai da ONDA, na escala Douglas —');
{
  const casos = [
    [0.03, 'Espelhado'], [0.09, 'Espelhado'],
    [0.10, 'Calmo'], [0.30, 'Calmo'], [0.49, 'Calmo'],
    [0.50, 'Leve'], [1.24, 'Leve'],
    [1.25, 'Moderado'], [2.49, 'Moderado'],
    [2.50, 'Grosso'], [3.90, 'Grosso'],
    [4.00, 'Muito grosso'], [5.90, 'Muito grosso'],
    [6.00, 'Tempestuoso'], [9.00, 'Tempestuoso'],
  ];
  let todos = true;
  casos.forEach(c => {
    const r = B12.estadoDoMar(c[0]);
    if (r !== c[1]) { todos = false; console.log('     ' + c[0] + 'm deu "' + r + '", esperado "' + c[1] + '"'); }
  });
  eh('as 15 faixas de altura batem com a escala', todos);
  eh('sem dado, não inventa', B12.estadoDoMar(null) === '—' && B12.estadoDoMar(undefined) === '—');

  /* a fronteira que importa: 2,5 m é onde o aviso da Marinha começa a falar
     em MAR GROSSO. Errar aqui é dizer "moderado" num dia de aviso. */
  eh('2,5 m já é GROSSO, não moderado', B12.estadoDoMar(2.5) === 'Grosso',
     'deu ' + B12.estadoDoMar(2.5));
  eh('2,49 m ainda é moderado', B12.estadoDoMar(2.49) === 'Moderado');
}

console.log('\n— o vento sai em Beaufort, igual ao aviso —');
{
  const casos = [[0.5,0],[3,1],[10,2],[17,3],[25,4],[35,5],[45,6],[55,7],[70,8],[85,9],[95,10],[110,11],[130,12]];
  let todos = true;
  casos.forEach(c => {
    const r = B12.forcaBeaufort(c[0]);
    if (r !== c[1]) { todos = false; console.log('     ' + c[0] + 'km/h deu força ' + r + ', esperado ' + c[1]); }
  });
  eh('as 13 forças batem com a tabela', todos);
  eh('força 7 (aviso de VENTO FORTE) vira "Forte"', B12.forcaVento(55) === 'Forte',
     'deu ' + B12.forcaVento(55));
  eh('força 8 já é "Muito forte"', B12.forcaVento(70) === 'Muito forte');
  eh('brisa de 10 km/h é "Fraco", não "Calmo"', B12.forcaVento(10) === 'Fraco');
}

console.log('\n— o erro que isto existe para impedir —');
{
  /* dia de marulho: vento fraco na praia, onda grande chegando de longe */
  const ventoFraco = 8;        /* km/h — "calmo" por qualquer régua de vento */
  const ondaGrande = 2.8;      /* m   — mar GROSSO */
  eh('vento fraco + onda de 2,8 m NÃO pode virar "calmo"',
     B12.estadoDoMar(ondaGrande) === 'Grosso' && B12.forcaVento(ventoFraco) === 'Fraco',
     'mar=' + B12.estadoDoMar(ondaGrande) + ' vento=' + B12.forcaVento(ventoFraco));
}

console.log('\n' + (falhou ? '✗ ' : '✓ ') + ok + ' passaram, ' + falhou + ' falharam\n');
process.exit(falhou ? 1 : 0);
