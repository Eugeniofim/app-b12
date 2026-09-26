/* ============================================================================
   Estação B12 — o endereço da nuvem

   Este arquivo é a ÚNICA porta entre o app e o banco. Trocar de cliente é
   trocar estas duas linhas.

   A chave abaixo é a PÚBLICA (publishable). Ela pode aparecer no navegador e
   no repositório: quem protege os dados é a tranca por papel (RLS) dentro do
   banco, não o segredo da chave. A chave SECRETA nunca entra aqui — ela fica
   só no painel do Supabase e em função de servidor.

   Banco: conta do Dhalsin (luistinglin@gmail.com) · organização "Estacao B12"
   Projeto: b12 · região São Paulo · criado em 26/09/2026
   ========================================================================== */
var B12 = window.B12 || {};

B12.NUVEM = {
  url: 'https://jvvniuzwltmbhhweaoqd.supabase.co',
  chave: 'sb_publishable_xXWoJeyTEaH3qCEjtS3XWg_H_ml5WIx',
  ligada: false      /* vira true quando a troca do banco do aparelho estiver testada */
};

window.B12 = B12;
