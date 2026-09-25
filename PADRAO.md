# Padrão visual do app da Estação B12

Um lugar só para as decisões de aparência. Antes de inventar cor, tamanho ou componente
novo, procurar aqui. Se não existir, acrescentar aqui **e** no `estilo.css`.

## 1. A marca

A marca é **um desenho só, o oficial**, entregue pelo cliente em 25/09/2026 (arte de
TiagoKai, junho/2025). Original em `~/Desktop/dhalsin - marca/b12_LOGO.pdf`. No app ela vive
em dois lugares, com o mesmo traçado:

| Arquivo | Para quem |
|---|---|
| `fotos/marca.svg` · `fotos/farol.svg` | telas em HTML |
| `marca.js` (`B12.LOGO`, `B12.FAROL`) | telas montadas em JavaScript (portão, ticket) |

**Regras:**

- **Nunca redesenhar a marca na mão.** Se precisar de um recorte novo, sai do PDF oficial.
- A cor vem do CSS (`currentColor`). Não pintar dentro do SVG.
- **Controlar sempre pela altura**; a proporção é 1,725 : 1 e não se estica.
- O desenho é preto e branco. Sobre o azul da marca ele é branco; sobre fundo claro, azul-800.

**Escala em uso:**

| Lugar | Altura | Cor |
|---|---|---|
| Herói do turista | 52 px (58 acima de 420 px) | branco, com sombra |
| Painel do dono | 30 px | branco, 95% |
| Ticket | 32 px | branco |
| Portão do PIN | 56 px, só o farol | branco sobre o selo turquesa |
| Ícone do app | farol branco sobre `#0B2A4A` | 192, 512, maskable (margem maior), apple-touch 180 |

## 2. Cor

Definidas em `:root`, no topo do `estilo.css`. **Usar o token, não o hex.**

| Papel | Token | Valor |
|---|---|---|
| Mar fundo, cabeçalho, ícone | `--azul-800` | `#0B2A4A` |
| Mar claro, degradês | `--azul-600` | `#12608E` |
| Ação, confirmação, marca-d'água | `--turq-600` | `#0B7A70` |
| Destaque de preço, aviso do herói | `--ouro` | `#F2B93B` |
| Fundo da tela | `--fundo` | `#EDF2F5` |
| Texto | `--tinta` / `--tinta-2` / `--tinta-3` | do mais escuro ao mais claro |
| Painel do dono | `--noite`, `--noite-2`, `--noite-3`, `--gelo*` | tema escuro |
| Semáforo | `--bom` / `--atencao` / `--ruim` | verde, âmbar, vermelho |

O painel do dono redefine `--bom`, `--atencao` e `--ruim` em `body.adm` para versões mais
claras, porque o fundo é escuro. Contraste mínimo de 4,5:1 em texto.

**Exceções legítimas de hex cravado:** o verde do WhatsApp (`#25D366`), o branco puro e as
cores dos gráficos em `adm.js`. Todo o resto deve virar token.

## 3. Tipografia

A fonte da marca é stencil, veio em curvas e **não acompanha os arquivos**. Por isso o app
não escreve nada "na fonte da marca": o logo é imagem, o resto é a fonte do sistema.

- Texto: `--sans` (a fonte do próprio celular: San Francisco no iPhone, Roboto no Android).
- A cursiva do "aqui!" no herói: `--script`, e **só ali**.
- Números de dinheiro e tabelas: `font-variant-numeric: tabular-nums`, para as colunas baterem.
- Nada abaixo de 10 px. Campo de formulário sempre 16 px, senão o iPhone dá zoom sozinho.
- Rótulo de seção: 10,5 px, 800, caixa alta, `letter-spacing:.08em`.

## 4. Espaço, cantos e sombra

- Margem padrão das caixas: 12 px. Respiro interno: 14 a 15 px.
- Cantos: `--r-p` 10 px (pequeno), `--r-m` 14 px (cartão), `--r-g` 20 px.
- Sombras: `--sombra-1` para cartão em repouso, `--sombra-2` para o que está levantado.
- **Alvo de toque: 44 px.** A regra fica repetida no fim do `estilo.css` de propósito, porque
  a última regra de mesma força vence (ver as armadilhas na memória do projeto).

## 5. Componentes que já existem

Antes de criar, reaproveitar: `.cx` (caixa branca, com as variantes `.nota`, `.aviso`,
`.bom`), `.cartao` e `.pcard` (cartões com foto), `.lugar` (cartão de lugar da Ilha),
`.btn` (`.pri`, `.sec`, `.zap`, `.peq`), `.folha` (a folha que sobe de baixo, em
`formularios.js`), `.tabela`, `.placar` + `tile()` no painel, `.chip-info`, `.faixa-sec`
para título de seção, `.portao` para o PIN.

## 6. Movimento

- Entrada de conteúdo: `.entra` mais `.entra-1` a `.entra-6` para escalonar.
- Curva única: `--curva`. Duração de 150 a 300 ms.
- Toque afunda o elemento (`transform: scale(.97)`), não muda a cor.
- Hover só dentro de `@media (hover:hover) and (pointer:fine)`, para não grudar no celular.
