# A nuvem da B12 — onde está

**12/10/2026.** A B12 saiu do projeto próprio e virou uma **sala** dentro do
Supabase pago do estúdio, igual a Mario, Mari, Dulcineia e Carol.

## Por que mudou

O projeto `b12` (conta do Dhalsin, plano grátis) foi **pausado** entre 10 e 12/10,
e nem deixava retomar. A causa não era inatividade — o despertador estava
funcionando. Era isto, que o painel do Supabase só conta quando você tenta:

> O limite de **2 projetos grátis é POR PESSOA**, somando toda organização onde
> essa pessoa é **dona ou administradora**.

O Eugênio entrou como administrador na organização da B12 e já tinha as duas
vagas ocupadas (`confeito-por-ananda` e `emroma`). Resultado: o banco do cliente
passou a pesar no limite dele e caiu junto.

## Onde está agora

| | |
|---|---|
| Conta | do **Eugênio** · organização **Ebook Premium Studio** · plano **Pro** |
| Projeto | `APP gestão TI ARTES` (`uopfqlogjzuqpabptxkb`) · São Paulo |
| Endereço | `https://uopfqlogjzuqpabptxkb.supabase.co` |
| Isolamento | tabelas `public.b12_*`, cada uma com a própria RLS |
| Custo adicional | **zero** — é o projeto que já existia |
| Pausa | não pausa: plano pago |

Rodado e conferido no próprio banco em 12/10/2026:

- **13 tabelas** `b12_*` · **13 com a tranca (RLS) ligada** · **21 políticas**
- **9 tabelas no tempo real**
- As **25 tabelas das outras salas** e as **2 do cofre** ficaram intactas

### O que foi testado do endereço do app, sem login

| | |
|---|---|
| ler clientes | `200` com lista vazia — certo: sem login ninguém vê nada |
| gravar lançamento | **bloqueado** pela RLS |
| pedir reserva (`pedida` + `app`) | `201` — é o único caminho aberto, e é de propósito |
| pedir reserva como `confirmada` | **bloqueado** — não dá para se autoconfirmar |

**Armadilha paga no caminho:** com `Prefer: return=representation` o insert do
turista devolve erro de RLS mesmo estando certo — porque a volta exige um SELECT
que o anônimo não tem. Sem o cabeçalho, passa. Não é bug do banco.

## Quem entra

- `eugeniofim@gmail.com` → papel **dono** em `b12_pessoas` (para testar e dar suporte)
- `luistinglin@gmail.com` (o Dhalsin) → papel **dono**, `ativo = true`.
  **A conta EXISTE desde 16/10/2026, 11:25**, criada pelo painel já confirmada.
  **Nunca foi usada**: `last_sign_in_at` continua NULL (conferido em 13/11/2026).

  > Este arquivo dizia, até 13/11/2026, que a conta não existia — e isso fez
  > eu mandar o Eugênio criar uma conta que já estava lá. Sempre conferir no
  > banco antes de repetir o que está escrito aqui:
  >
  > ```sql
  > select u.email, u.last_sign_in_at, p.papel, p.ativo
  > from auth.users u left join public.b12_pessoas p on p.id = u.id
  > order by u.created_at;
  > ```

## O que falta

Conferido em 13/11/2026, medindo no banco e no ar — não de cabeça:

1. ~~Publicar as funções~~ **FEITO.** `avisar` e `email` respondem.
2. ~~Pôr os segredos~~ **FEITO.** O e-mail saiu de ponta a ponta
   (`{"ok":true,"enviados":1,"falhas":0}`) e a assinatura VAPID foi aceita
   pelo FCM do Google.
3. ~~Criar a conta do Dhalsin~~ **JÁ EXISTIA** desde 16/10. Ver "Quem entra".
4. **O Dhalsin entrar pela primeira vez.** É o único passo que falta para a
   nuvem ligar no aparelho dele: `Estação → Dados → Ligue a nuvem → Entrar`.
   A senha é dele; se ninguém souber, o caminho é mandar a redefinição pelo
   Authentication do painel — ele escolhe a própria, e ninguém mais digita.

## A rede de segurança

O projeto antigo (`jvvniuzwltmbhhweaoqd`) continua **pausado e guardado** na
conta do Dhalsin, com todos os dados e backups, e pode ser retomado até
**16/11/2027**. Nada foi apagado lá.
