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
- O Dhalsin ainda **não tem conta neste projeto**. Quando for usar, o caminho é
  convite por e-mail no Authentication — ele escolhe a própria senha, ninguém
  mais digita.

## O que falta

1. **Publicar as duas funções** no projeto novo: `avisar` (notificação no
   celular) e `email`. O código está em `nuvem/funcoes/`.
2. **Pôr os segredos** — só o Eugênio faz, são credenciais dele:
   `VAPID_PUBLICA`, `VAPID_PRIVADA`, `VAPID_CONTATO` (estão em
   `~/Desktop/B12/12-CHAVES-AVISOS.txt`) e `COFRE_TOKEN`.
   Enquanto não estiverem lá, o botão de e-mail e o de notificação dão erro.
3. **Criar a conta do Dhalsin** quando ele for começar.

## A rede de segurança

O projeto antigo (`jvvniuzwltmbhhweaoqd`) continua **pausado e guardado** na
conta do Dhalsin, com todos os dados e backups, e pode ser retomado até
**16/11/2027**. Nada foi apagado lá.
