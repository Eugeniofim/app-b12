# app-b12 — Estação B12

Aplicativo da **Estação B12** (travessias e passeios para a Ilha do Mel, Pontal do Paraná – PR),
feito pelo studio Ti Artes.

## Onde está no ar

- **Hoje:** https://eugeniofim.github.io/app-b12/ — página de boas-vindas, enquanto o app é construído.
- **Destino final:** `https://app.estacaob12.com.br` — é o endereço impresso no QR code dos
  cartões e do banner. Depende de um registro CNAME na zona `estacaob12.com.br`
  (Registro.br, domínio da própria empresa):

  | Tipo | Nome | Destino |
  |---|---|---|
  | CNAME | `app` | `eugeniofim.github.io.` |

  Quando esse registro existir, renomear `CNAME.quando-o-dns-do-cliente-estiver-pronto`
  para `CNAME` e ligar o domínio em Settings → Pages. O endereço do github passa a
  redirecionar sozinho para o domínio do cliente, e nenhum link antigo quebra.

**Não adicionar o arquivo CNAME antes de o DNS resolver** — o Pages passa a redirecionar
para um endereço que não existe e o site sai do ar.

## Documentação do projeto

Fica fora deste repositório, em `~/Desktop/B12`: o mapa dos 62 pedidos do cliente, o plano
tarefa por tarefa, a análise dos 11 anos de planilha e o modelo de dados.

## Regra de ouro

Um app, um endereço. Este repositório é a única fonte do que está no ar.
