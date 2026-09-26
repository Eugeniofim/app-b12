# Ligar a nuvem da B12 — o passo a passo

**Por que agora:** o Dhalsin vai pôr mais marinheiros usando o app para buscar e levar
gente na Ilha. Sem nuvem, cada celular é um caderno separado: um marinheiro marca a volta
de um passageiro e o outro não vê. Com nuvem, os dois veem a mesma escala, na hora.

## O que muda, na prática

| Hoje | Com a nuvem |
|---|---|
| Cada aparelho tem os próprios dados | Todos veem a mesma coisa, em cerca de 1 segundo |
| O PIN é a tranca da porta | Login de verdade; o servidor é quem decide quem vê o quê |
| A equipe não vê dinheiro porque a tela esconde | A equipe não vê dinheiro porque **o banco não entrega** |
| Cópia de segurança é o dono quem baixa | Cópia automática no servidor, todo dia |
| Se o celular quebrar, os dados vão junto | Os dados estão no servidor |

## O que o Dhalsin precisa fazer (uma vez, 10 minutos)

1. **Criar a conta no Supabase** com o e-mail da B12 (supabase.com → Start your project).
2. **Criar a organização** "Estação B12" e o projeto "app-b12".
   Região: **South America (São Paulo)** — é a mais perto, a resposta fica mais rápida.
   Guardar a senha do banco que ele mostrar.
3. Em **Organization → Team → Invite**, convidar `eugeniofim@gmail.com`.
4. Avisar o Eugênio.

**Plano:** o grátis serve para começar e para o primeiro ano. O que o grátis não tem é cópia
diária automática; enquanto isso, um robô no GitHub baixa o banco toda noite. Quando o
movimento justificar, o Pro (US$ 25/mês) entra com um clique, sem mexer no app.

## O que o Eugênio faz depois (mesmo dia)

1. Rodar `01-esquema.sql` no SQL Editor: cria as 9 tabelas, a tranca por papel e o aviso na hora.
2. Criar o primeiro usuário (o Dhalsin) e marcar como `dono` em `b12_pessoas`.
3. Preencher `config.js` com o endereço e a chave pública do projeto.
4. Trocar o "banco no aparelho" pelo "banco na nuvem" dentro do `nucleo.js`.
   **Nenhuma tela muda**: todas passam por lá.
5. Importar o que já existe: o histórico da planilha e as reservas reais.
6. Testar com dois celulares por uma semana antes de soltar para a equipe.

## Como os marinheiros entram

Cada um ganha um e-mail e uma senha, criados pelo Dhalsin no painel. Ele pode desligar um
marinheiro a qualquer momento, e no mesmo instante aquele celular para de ver a escala.
Ninguém compartilha senha, e ninguém da equipe enxerga faturamento, custo ou cliente com
valor gasto — isso é garantido pelo banco, não pela tela.

## O que continua funcionando sem internet

O app guarda uma cópia no aparelho. Sem sinal no trapiche, o marinheiro continua vendo a
escala do dia e marcando embarque; quando o sinal volta, tudo sobe sozinho. É o mesmo
princípio de hoje, só que agora com um lugar central para onde mandar.

## Decisões que já estão tomadas no esquema

- **Dinheiro é só do dono.** As tabelas de lançamentos e contas só respondem para quem é dono.
- **O turista não tem conta.** Ele só pode criar uma reserva "pedida" e consultar a própria
  pelo código. Não lê a de ninguém.
- **Carimbo de hora em tudo**, para a sincronia saber o que mudou sem baixar o banco inteiro.
- **Aviso na hora** ligado nas tabelas da operação: saídas, reservas, pátio, clientes e ajustes.
