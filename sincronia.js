/* ============================================================================
   Estação B12 — a sincronia

   A REGRA: um banco, muitas janelas. Cada reserva, cliente, saída e
   lançamento é UMA LINHA no Postgres. O celular do Dhalsin e o da
   funcionária não têm "a versão deles" — olham a mesma coisa.

   O `localStorage` continua, mas vira CACHE: o que faz o app abrir rápido e
   funcionar sem internet. A verdade mora no banco.

   TRÊS ARMADILHAS QUE ESTE ARQUIVO JÁ EVITA (pagas no TI ARTES OS e no app
   da Melissa — ver as skills `app-sempre-junto` e `app-um-so`):

   1. Enviar antes do primeiro ritual empurra o catálogo de fábrica por cima
      do banco. Por isso existe EM_DIA.
   2. `FILA.slice(n)` derruba o que entrou DURANTE o envio. Aqui é `filter`.
   3. O eco da própria subida volta ATRASADO e regride o registro. Por isso
      ENVIADOS guarda o que este aparelho acabou de mandar, e mudança local
      pendente sempre vence a linha que chega.

   E uma que é só da B12: a FUNCIONÁRIA NÃO LÊ DINHEIRO. O banco recusa, e
   isso é certo. Então a sincronia PULA as coleções que o papel não alcança —
   nunca apaga o que não conseguiu ler.
   ========================================================================== */
(function () {
  'use strict';

  /* coleção do app  →  tabela no banco. 'ajustes' é singular: uma linha só. */
  var MAPA = {
    reservas:    'b12_reservas',
    clientes:    'b12_clientes',
    saidas:      'b12_saidas',
    patio:       'b12_patio',
    lancamentos: 'b12_lancamentos',
    contas:      'b12_contas',
    manutencoes: 'b12_manutencoes',
    marinheiros: 'b12_marinheiros'
  };
  var SO_DO_DONO = { lancamentos: 1, contas: 1, manutencoes: 1 };
  var COLECOES = Object.keys(MAPA);

  var K_SOMBRA = 'b12_sombra', K_FILA = 'b12_fila',
      K_MARCA = 'b12_marca',   K_EMDIA = 'b12_emdia';

  var SOMBRA = ler(K_SOMBRA, {});     /* o que este aparelho sabe que já subiu */
  var FILA   = ler(K_FILA, []);       /* o que ainda não subiu */
  var MARCA  = ler(K_MARCA, {});      /* até que carimbo já li, por coleção */
  var EM_DIA = ler(K_EMDIA, false);   /* já fez o primeiro ritual completo? */
  var ENVIADOS = {};                  /* só na memória: o eco da própria subida */
  var enviando = false, puxando = false, orelha = null, pulso = null;

  function ler(k, padrao) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; }
    catch (e) { return padrao; }
  }
  function grava(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ------------------------------------------------------------ o portão
     Um lugar só decide se dá para falar com o banco. Repetir esta checagem
     solta em cinco lugares é como os bugs do app da Melissa nasceram. */
  B12.sincPronta = function () {
    return !!(B12.NUVEM && B12.NUVEM.url && B12.NUVEM.ligada &&
              B12.nuvLogado && B12.nuvLogado());
  };
  function papelNuvem() { return ((B12.nuvQuem && B12.nuvQuem()) || {}).papel || 'equipe'; }
  function alcanca(col) { return !(SO_DO_DONO[col] && papelNuvem() !== 'dono'); }

  function comPrazo(url, opc) {
    opc = opc || {};
    var corta = new AbortController();
    var relogio = setTimeout(function () { corta.abort(); }, 12000);
    opc.signal = corta.signal;
    return fetch(url, opc).finally(function () { clearTimeout(relogio); });
  }

  /* =========================================================== ENFILEIRAR
     Compara o que está na tela com o que subiu, e separa a diferença. */
  function enfileirar() {
    if (!B12.sincPronta() || !EM_DIA) return;
    COLECOES.forEach(function (col) {
      if (!alcanca(col)) return;
      SOMBRA[col] = SOMBRA[col] || {};
      var vivos = {};
      (B12.DB[col] || []).forEach(function (o) {
        if (!o || !o.id) return;
        /* dado de demonstração NUNCA sobe: é o que enche a tela numa
           apresentação, e no banco do cliente viraria caixa falso */
        if (B12.ehDemo && B12.ehDemo(o)) return;
        vivos[o.id] = 1;
        var agora = JSON.stringify(o);
        if (SOMBRA[col][o.id] !== agora) {
          por(col, o.id, o, false);
          SOMBRA[col][o.id] = agora;
        }
      });
      /* sumiu da tela: marca apagado, nunca deixa a linha viva no banco —
         senão o outro aparelho devolve na próxima leitura */
      Object.keys(SOMBRA[col]).forEach(function (id) {
        if (!vivos[id]) { por(col, id, null, true); delete SOMBRA[col][id]; }
      });
      /* e o que vem do banco e é demo daqui não conta: a varredura diária
         recria os demos com ids novos, e eles não existem na SOMBRA */
    });
    /* ajustes é uma linha só */
    var aj = JSON.stringify(B12.DB.ajustes || {});
    if (SOMBRA.__ajustes !== aj) {
      por('ajustes', '1', B12.DB.ajustes, false);
      SOMBRA.__ajustes = aj;
    }
    grava(K_SOMBRA, SOMBRA);
    grava(K_FILA, FILA);
  }

  function por(col, id, dados, apagado) {
    FILA = FILA.filter(function (f) { return !(f.col === col && f.id === id); });
    FILA.push({ col: col, id: id, dados: dados, apagado: !!apagado });
  }

  /* ============================================================== ENVIAR */
  async function enviarFila() {
    if (enviando || !B12.sincPronta() || !FILA.length) return;
    enviando = true;
    try {
      var porCol = {};
      FILA.forEach(function (f) { (porCol[f.col] = porCol[f.col] || []).push(f); });

      for (var col in porCol) {
        if (col !== 'ajustes' && !alcanca(col)) continue;
        var tabela = col === 'ajustes' ? 'b12_ajustes' : MAPA[col];
        var lote = porCol[col].slice(0, 200);
        var corpo = lote.map(function (f) {
          return col === 'ajustes'
            ? { id: 1, dados: f.dados || {} }
            : { id: f.id, dados: f.dados || {}, apagado: f.apagado };
        });
        var cab = B12.nuvCabecalho();
        cab.Prefer = 'resolution=merge-duplicates,return=minimal';
        var r = await comPrazo(B12.NUVEM.url + '/rest/v1/' + tabela + '?on_conflict=id',
          { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
        if (!r.ok) { enviando = false; return; }   /* falhou: a fila fica */

        /* o eco da própria subida: guardar para não regredir o registro
           quando essa mesma linha voltar na leitura */
        lote.forEach(function (f) {
          if (f.apagado) return;
          var ch = f.col + '/' + f.id;
          ENVIADOS[ch] = (ENVIADOS[ch] || []).concat(JSON.stringify(f.dados)).slice(-3);
        });
        /* ARMADILHA: slice(lote.length) derrubaria o que entrou durante o POST */
        FILA = FILA.filter(function (f) { return lote.indexOf(f) < 0; });
        grava(K_FILA, FILA);
      }
    } catch (e) {
      /* rede fora não é erro que mereça tela: a fila espera */
    } finally { enviando = false; }
  }

  /* =============================================================== PUXAR */
  async function puxar() {
    if (puxando || !B12.sincPronta()) return { ok: false };
    puxando = true;
    var mudou = false;
    try {
      var alvos = COLECOES.filter(alcanca).concat(['ajustes']);
      for (var i = 0; i < alvos.length; i++) {
        var col = alvos[i];
        var tabela = col === 'ajustes' ? 'b12_ajustes' : MAPA[col];
        var desde = MARCA[col] || '1970-01-01T00:00:00Z';
        var url = B12.NUVEM.url + '/rest/v1/' + tabela +
          '?select=*&atualizado=gt.' + encodeURIComponent(desde) +
          '&order=atualizado.asc&limit=1000';
        var r = await comPrazo(url, { headers: B12.nuvCabecalho() });
        /* 401/403 = este papel não alcança. NÃO é motivo para apagar nada. */
        if (!r.ok) continue;
        var linhas = await r.json();
        if (!Array.isArray(linhas) || !linhas.length) continue;
        linhas.forEach(function (l) { if (aplicarLinha(col, l)) mudou = true; });
        MARCA[col] = linhas[linhas.length - 1].atualizado;
      }
      grava(K_MARCA, MARCA);
      grava(K_SOMBRA, SOMBRA);
      if (mudou) {
        /* DB.salvar e não B12.salvar: senão re-enfileira o que acabou de chegar */
        try { localStorage.setItem('b12_dados_v1', JSON.stringify(B12.DB)); } catch (e) {}
        if (B12.redesenhar) B12.redesenhar();
      }
      return { ok: true, mudou: mudou };
    } catch (e) {
      return { ok: false, erro: String(e && e.message || e) };
    } finally { puxando = false; }
  }

  function aplicarLinha(col, l) {
    if (col === 'ajustes') {
      var novo = JSON.stringify(l.dados || {});
      if (SOMBRA.__ajustes === novo) return false;
      if (FILA.some(function (f) { return f.col === 'ajustes'; })) return false;
      Object.keys(B12.DB.ajustes).forEach(function (k) { delete B12.DB.ajustes[k]; });
      Object.assign(B12.DB.ajustes, l.dados || {});
      SOMBRA.__ajustes = novo;
      return true;
    }

    var ch = col + '/' + l.id, bruto = JSON.stringify(l.dados || {});
    /* o eco da própria subida, às vezes atrasado: ignorar */
    if ((ENVIADOS[ch] || []).indexOf(bruto) >= 0) return false;
    /* mudança local pendente vence a linha que chega */
    if (FILA.some(function (f) { return f.col === col && f.id === l.id; })) return false;

    B12.DB[col] = B12.DB[col] || [];
    var i = -1;
    for (var k = 0; k < B12.DB[col].length; k++) {
      if (B12.DB[col][k] && B12.DB[col][k].id === l.id) { i = k; break; }
    }

    if (l.apagado) {
      if (i < 0) return false;
      B12.DB[col].splice(i, 1);
      SOMBRA[col] = SOMBRA[col] || {}; delete SOMBRA[col][l.id];
      return true;
    }

    if (i < 0) {
      B12.DB[col].push(l.dados);
    } else {
      if (JSON.stringify(B12.DB[col][i]) === bruto) return false;
      /* DENTRO do mesmo objeto: quem segurou a referência continua certo */
      var o = B12.DB[col][i];
      Object.keys(o).forEach(function (k) { delete o[k]; });
      Object.assign(o, l.dados);
    }
    SOMBRA[col] = SOMBRA[col] || {};
    SOMBRA[col][l.id] = bruto;
    return true;
  }

  /* ========================================================== O RITUAL
     A primeira sincronia do aparelho. Só depois dela o app pode ENVIAR. */
  B12.sincAoAbrir = async function () {
    if (!B12.sincPronta()) return { erro: 'semNuvem' };

    /* o banco do plano grátis dorme: a primeira chamada do dia pode falhar */
    var r = null;
    for (var t = 0; t < 3; t++) {
      r = await puxar();
      if (r.ok) break;
      await new Promise(function (x) { setTimeout(x, 1200 * (t + 1)); });
    }
    if (!r || !r.ok) return { erro: 'rede' };

    if (!EM_DIA) {
      /* a SOMBRA nasce do que está na tela, para o primeiro envio levar só
         o que o banco ainda não tem — e não o catálogo de fábrica inteiro */
      EM_DIA = true; grava(K_EMDIA, true);
    }
    enfileirar();
    await enviarFila();
    ligarOrelha();
    return { ok: true };
  };

  /* ====================================================== O CUTUCÃO (realtime) */
  function ligarOrelha() {
    if (orelha || !B12.sincPronta()) return;
    try {
      var u = B12.NUVEM.url.replace(/^http/, 'ws') +
        '/realtime/v1/websocket?apikey=' + B12.NUVEM.chave + '&vsn=1.0.0';
      orelha = new WebSocket(u);
      orelha.onopen = function () {
        COLECOES.filter(alcanca).concat(['ajustes']).forEach(function (col) {
          var tabela = col === 'ajustes' ? 'b12_ajustes' : MAPA[col];
          orelha.send(JSON.stringify({
            topic: 'realtime:' + tabela, event: 'phx_join', ref: String(Date.now()),
            payload: { config: { postgres_changes: [
              { event: '*', schema: 'public', table: tabela } ] },
              access_token: B12.nuvToken() }
          }));
        });
        pulso = setInterval(function () {
          try { orelha.send(JSON.stringify({ topic:'phoenix', event:'heartbeat',
                payload:{}, ref:String(Date.now()) })); } catch (e) {}
        }, 25000);
      };
      orelha.onmessage = function (ev) {
        try { var m = JSON.parse(ev.data);
          if (m.event === 'postgres_changes') puxar(); } catch (e) {}
      };
      orelha.onclose = function () {
        clearInterval(pulso); orelha = null;
        setTimeout(ligarOrelha, 8000);   /* caiu: volta, sem desistir */
      };
      orelha.onerror = function () { try { orelha.close(); } catch (e) {} };
    } catch (e) { orelha = null; }
  }

  /* ============================================== o gatilho do B12.salvar */
  var agendado = null;
  B12.sincAgendar = function () {
    if (!B12.sincPronta() || !EM_DIA) return;
    clearTimeout(agendado);
    agendado = setTimeout(function () { enfileirar(); enviarFila(); }, 900);
  };

  /* ================================================= o cofre, agora na nuvem
     A cópia de segurança deixa de morar só no celular. Uma por dia basta:
     o que interessa é ter de onde voltar se o aparelho sumir. */
  B12.cofreNuvem = async function (motivo) {
    if (!B12.sincPronta() || papelNuvem() !== 'dono') return { erro: 'soDono' };
    var hoje = B12.hoje();
    var peso = COLECOES.reduce(function (s, c) { return s + (B12.DB[c] || []).length; }, 0);
    if (!peso) return { erro: 'vazio' };          /* vazio nunca vira cópia */
    var id = hoje + '-' + String(new Date().getHours()).padStart(2, '0') +
             String(new Date().getMinutes()).padStart(2, '0');
    var cab = B12.nuvCabecalho();
    cab.Prefer = 'resolution=merge-duplicates,return=minimal';
    try {
      var r = await comPrazo(B12.NUVEM.url + '/rest/v1/b12_cofre?on_conflict=id', {
        method: 'POST', headers: cab,
        body: JSON.stringify([{ id: id, dia: hoje, motivo: motivo || 'auto',
                                peso: peso, dados: B12.DB }])
      });
      return r.ok ? { ok: true, id: id, peso: peso } : { erro: 'recusado', status: r.status };
    } catch (e) { return { erro: 'rede' }; }
  };

  B12.cofreNuvemLista = async function () {
    if (!B12.sincPronta()) return { erro: 'semNuvem' };
    try {
      var r = await comPrazo(B12.NUVEM.url +
        '/rest/v1/b12_cofre?select=id,dia,motivo,peso,criado&order=criado.desc&limit=30',
        { headers: B12.nuvCabecalho() });
      if (!r.ok) return { erro: 'recusado' };
      return { ok: true, copias: await r.json() };
    } catch (e) { return { erro: 'rede' }; }
  };

  /* ---------------------------------------------------- quando conferir
     Ao voltar para o app, quando a internet volta, e de 5 em 5 minutos. O
     relógio sozinho não basta: no celular o app fica congelado e o timer
     pode nunca rodar. */
  function rechecar() { if (B12.sincPronta() && EM_DIA) puxar(); }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { rechecar(); enviarFila(); }
  });
  window.addEventListener('online', function () { rechecar(); enviarFila(); });
  setInterval(rechecar, 5 * 60 * 1000);
  setInterval(function () { if (B12.sincPronta() && EM_DIA) B12.cofreNuvem('dia'); },
              6 * 60 * 60 * 1000);

  /* estado para a tela de Dados dizer a verdade */
  B12.sincEstado = function () {
    return { ligada: B12.sincPronta(), emDia: EM_DIA, fila: FILA.length,
             papel: papelNuvem(), orelha: !!orelha,
             lido: MARCA.reservas || null };
  };
})();
