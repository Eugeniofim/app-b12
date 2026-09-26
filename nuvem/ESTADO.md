# A nuvem da B12 — onde está

**26/09/2026.** O banco existe, está no ar e está trancado. Ainda **não está ligado ao app**:
o `config.js` traz `ligada: false` de propósito, para o app continuar guardando no aparelho
até a troca do banco estar testada.

## O que já está feito

| | |
|---|---|
| Conta | do **Dhalsin** (`luistinglin@gmail.com`) — nunca a do Eugênio |
| Organização | Estacao B12 · plano Free |
| Projeto | `b12` · região **South America (São Paulo)** |
| Endereço | `https://jvvniuzwltmbhhweaoqd.supabase.co` |
| Senha do banco | gerada pelo próprio Supabase. O app **não usa** essa senha; se precisar dela, dá para gerar outra em Settings → Database |
| RLS automática | ligada — tabela nova já nasce trancada |

Rodado o `01-esquema.sql`, conferido no próprio banco:

- **9 tabelas** `b12_*`
- **13 políticas** de acesso
- **9 tabelas com a tranca (RLS) ligada** — todas
- **5 tabelas no tempo real** (saídas, reservas, pátio, clientes, ajustes)
- **6 carimbos** de `atualizado`

## O que foi testado do endereço do app

Com a chave pública, de `https://app.estacaob12.com.br`:

- ler qualquer tabela → responde `200` com **lista vazia**. É o certo: sem login, ninguém vê nada.
- gravar lançamento, criar cliente, confirmar reserva, mudar ajustes → **401, bloqueado pela RLS**.

O único caminho aberto para quem não tem conta é o desenhado: pedir uma reserva
(`situacao = 'pedida'` e `origem = 'app'`).

## O que falta, na ordem

1. **Criar o usuário do Dhalsin** no Authentication e marcar `papel = 'dono'` em `b12_pessoas`.
   Ele escolhe a própria senha pelo convite por e-mail — ninguém mais digita a senha dele.
2. **Trocar o banco do aparelho pelo banco da nuvem** dentro do `nucleo.js`, mantendo o
   aparelho como cópia para funcionar sem internet.
3. **Subir o que já existe** no aparelho do Dhalsin (clientes, reservas, lançamentos).
4. **Testar com dois aparelhos** ao mesmo tempo: mexer num e ver mudar no outro.
5. Virar `ligada: true` no `config.js`.

Só depois disso é que e-mail, notificação no celular e WhatsApp automático passam a ser possíveis.
