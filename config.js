/* ============================================================================
   Estação B12 — o endereço da nuvem

   Este arquivo é a ÚNICA porta entre o app e o banco. Trocar de cliente é
   trocar estas duas linhas.

   A chave abaixo é a PÚBLICA (publishable). Ela pode aparecer no navegador e
   no repositório: quem protege os dados é a tranca por papel (RLS) dentro do
   banco, não o segredo da chave. A chave SECRETA nunca entra aqui — ela fica
   só no painel do Supabase e em função de servidor.

   MUDOU EM 12/10/2026. O banco era um projeto só da B12, na conta do Dhalsin,
   no plano grátis. O Supabase conta o limite de 2 projetos grátis POR PESSOA,
   em toda organização onde ela é dona ou administradora — e como o Eugênio
   entrou como administrador lá, o projeto da B12 passou a pesar no limite dele
   e foi pausado. Nem dava para retomar.

   Agora a B12 é mais uma SALA dentro do projeto pago do estúdio, igual a
   Mario, Mari, Dulcineia e Carol: mesmo banco, tabelas com prefixo `b12_`,
   cada uma trancada pela própria RLS. Plano Pro não pausa.

   Banco: conta do Eugênio · organização "Ebook Premium Studio" (Pro)
   Projeto: APP gestão TI ARTES · região São Paulo
   O projeto antigo (jvvniuzwltmbhhweaoqd) continua pausado e guardado na conta
   do Dhalsin até 16/11/2027, com todos os dados — é a rede de segurança.
   ========================================================================== */
var B12 = window.B12 || {};

B12.NUVEM = {
  url: 'https://uopfqlogjzuqpabptxkb.supabase.co',
  chave: 'sb_publishable_VKIdd2RNpMf3e4IEDprxJw_TOKPIHT2',

  /* A chave PÚBLICA dos avisos (VAPID). Trocou em 12/10/2026, junto com a
     mudança de banco: agora quem guarda o par é a própria função `avisar`,
     numa tabela que só ela lê. Ninguém mais cola chave em campo de painel.
     Esta linha é só um atalho — se faltar, o app pergunta ao servidor. */
  chavePush: 'BL0-ByqF36zR6jSnhVVCOYaaoa0TvAwuHk5oKzuuCKO80C8DUx1HOUG23D8c0ovBgFTkIi6rgpN5bsr6s-uAwSM',

  ligada: true      /* LIGADA em 06/10/2026. Só sincroniza com alguém logado. */
};

window.B12 = B12;
