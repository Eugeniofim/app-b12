/* ============================================================================
   Estação B12 — dados
   ----------------------------------------------------------------------------
   REAL: tudo em HIST vem da planilha "resist control" do cliente, lida em
   05/09/2026: 12.267 lançamentos de venda (ago/2015 a jul/2025), 712 de
   combustível e 443 de despesa. Nada aqui foi inventado.

   DEMONSTRAÇÃO: o movimento do mês corrente é gerado a partir da sazonalidade
   real, para o painel ter o que mostrar antes de existir uso de verdade.
   Toda tela que usa dado gerado diz isso na cara.
   ========================================================================== */

var B12 = window.B12 || {};

/* ---------------------------------------------------------------- identidade */
B12.EMPRESA = {
  nome: 'Estação B12',
  slogan: 'Sua conexão com a Ilha do Mel',
  frase: 'Seja bem-vindo, sua experiência começa aqui',
  endereco: 'Av. Beira-Mar, 3433 · Pontal do Paraná – PR',
  cep: '83255-000',
  lat: -25.566233, lon: -48.356609,
  whats: '5541999497113',
  cnpj: '42.727.723/0001-37',
  dono: 'Dhalsin',
};

/* ------------------------------------------------------- catálogo de serviços */
B12.PASSEIOS = [
  { id:'golfinhos', nome:'Baía dos Golfinhos e Ilha das Peças', dur:'4h', preco:180,
    foto:'fotos/p-golfinhos.jpg', cor:'#12608E',
    resumo:'Encontro com os botos e parada na Ilha das Peças.',
    texto:'Saída pela baía de Paranaguá com parada para observar os botos-cinza em ambiente natural, e tempo em terra na vila caiçara da Ilha das Peças.',
    saida:'Manhã ou tarde, do trapiche da B12 em Pontal do Sul',
    inclui:['Marinheiro e lancha exclusiva','Coletes salva-vidas para todos','Parada para banho, se o mar deixar'],
    leve:['Protetor solar e chapéu','Água e um lanche','Dinheiro para a vila: não há caixa eletrônico'],
    roteiro:[
      { t:'Saída pela baía', foto:'fotos/p-golfinhos-1.jpg',
        txt:'A lancha deixa Pontal do Sul e entra na baía de Paranaguá, com a Ilha do Mel de um lado e as ilhas menores do outro. A água vai ficando calma, e a serra aparece no fundo.',
        hist:'A baía de Paranaguá é a maior do litoral do Paraná e uma das mais preservadas do Brasil: a maior parte das margens ainda é mangue e mata.' },
      { t:'O encontro com os botos', foto:'fotos/p-golfinhos-2.jpg',
        txt:'Na área onde os botos-cinza costumam se alimentar, o marinheiro desliga o motor e a lancha fica à deriva. É a vez de ficar em silêncio e olhar a água: eles aparecem em grupo, sobem para respirar e passam bem perto.',
        hist:'O boto-cinza (Sotalia guianensis) vive a vida inteira na mesma baía e é ameaçado de extinção. Por isso a regra é não perseguir, não alimentar e não pular na água com eles.' },
      { t:'Ilha das Peças', foto:'fotos/p-golfinhos-3.jpg',
        txt:'Parada na vila de pescadores, com praia de água calma de frente para a serra. Dá para caminhar, tomar banho e comer peixe fresco nos bares da comunidade.',
        hist:'A vila é caiçara: as famílias vivem da pesca há gerações. A ilha fica dentro do Parque Nacional do Superagui, e no fim da tarde os papagaios-de-cara-roxa voltam em bando para dormir nas ilhas vizinhas.' },
      { t:'A volta, com o sol se pondo', foto:'fotos/p-golfinhos-4.jpg',
        txt:'No retorno a lancha corta a baía de volta a Pontal. Na saída da tarde, o pôr do sol atrás da serra é a última parada.',
        hist:'' }],
    saber:['Os botos aparecem em 9 de cada 10 saídas, mas são animais livres: não há garantia.',
           'Passeio tranquilo, bom para crianças e para quem enjoa em mar aberto.',
           'Com chuva forte ou vento, a B12 remarca sem custo.'] },

  { id:'sebui', nome:'Reserva Ecológica do Sebuí', dur:'8h', preco:250,
    foto:'fotos/p-sebui.jpg', cor:'#0E7A6E',
    resumo:'Dia inteiro em Guaraqueçaba, mata atlântica preservada.',
    texto:'Passeio de dia inteiro até a reserva particular do Sebuí, em Guaraqueçaba, com trilha suspensa no mangue, mata fechada e banho de cachoeira.',
    saida:'08h00 em ponto, do trapiche da B12 em Pontal do Sul',
    inclui:['Marinheiro e lancha exclusiva','Coletes salva-vidas','Guia local na reserva','Almoço caiçara na reserva'],
    leve:['Tênis ou sapato fechado para a trilha','Repelente e protetor solar','Roupa de banho e toalha','Uma muda de roupa seca'],
    roteiro:[
      { t:'Travessia da baía dos Pinheiros', foto:'fotos/p-sebui-1.jpg',
        txt:'É a saída mais longa da B12: a lancha atravessa a baía de Paranaguá e entra na baía dos Pinheiros, cercada de mata até a beira da água. No caminho, botos e garças são companhia comum.',
        hist:'Guaraqueçaba guarda o maior trecho contínuo de mata atlântica preservada do Brasil. A região é tombada pela Unesco como Reserva da Biosfera.' },
      { t:'Trilha suspensa no mangue', foto:'fotos/p-sebui-2.jpg',
        txt:'A reserva começa por uma passarela de madeira sobre o mangue. Caranguejos, raízes aéreas e o cheiro de maresia: é um berçário do mar, explicado pelo guia passo a passo.',
        hist:'O mangue é onde nascem os peixes e camarões que sustentam a pesca da baía. Cada hectare preservado aqui aparece depois no prato dos restaurantes da Ilha.' },
      { t:'Mata fechada e canal', foto:'fotos/p-sebui-3.jpg',
        txt:'Depois do mangue a trilha entra na mata: bromélias, palmito, árvores de mais de trinta metros e o canto de pássaros que não existem em mais nenhum lugar.',
        hist:'A Reserva Natural Sebuí é uma reserva particular (RPPN), mantida por iniciativa privada e aberta a visitas guiadas. Ela protege nascentes que alimentam a baía.' },
      { t:'Cachoeira e almoço', foto:'fotos/p-sebui-4.jpg',
        txt:'A recompensa da trilha é o banho de água doce e gelada na cachoeira, seguido de almoço caiçara com peixe, banana e farinha, feito na reserva.',
        hist:'' }],
    saber:['Exige disposição para caminhar cerca de 3 km em trilha com trechos de subida.',
           'Recomendado a partir de 8 anos.',
           'Leve dinheiro em espécie: não há sinal de celular na reserva.'] },

  { id:'tour360', nome:'Tour 360°', dur:'5h', preco:200,
    foto:'fotos/p-tour360.jpg', cor:'#155E8C',
    resumo:'A volta completa pela Ilha do Mel, vista do mar.',
    texto:'A volta completa na Ilha do Mel pelo mar, passando pela Fortaleza, pelo Farol das Conchas, pelas praias de mar aberto e pela ponta das Encantadas, com paradas para banho.',
    saida:'09h00, do trapiche da B12 em Pontal do Sul',
    inclui:['Marinheiro e lancha exclusiva','Coletes salva-vidas','Duas paradas para banho','Parada em terra nas Encantadas'],
    leve:['Protetor solar, chapéu e óculos','Água e lanche','Capa de chuva leve, se o tempo estiver instável'],
    roteiro:[
      { t:'A Fortaleza pelo mar', foto:'fotos/p-tour360-1.jpg',
        txt:'A primeira parada é a vista que só o barco dá: a Fortaleza de Nossa Senhora dos Prazeres com o morro verde atrás, como quem chegava do oceano no século XVIII a via.',
        hist:'Construída entre 1767 e 1769 para guardar a entrada da baía, a fortaleza teve seu único combate em 1850, quando seus canhões dispararam contra a corveta inglesa Cormorant, que perseguia navios negreiros.' },
      { t:'Farol das Conchas', foto:'fotos/p-tour360-2.jpg',
        txt:'Contornando a ponta, aparece o farol no alto do morro, com a Praia do Farol de um lado e a Praia de Fora do outro. A lancha para diante da praia para fotos e banho.',
        hist:'Aceso em 1872, no Segundo Reinado, o farol foi montado com uma torre de ferro fundida na Escócia e trazida de navio. Até hoje orienta quem entra na baía.' },
      { t:'Praia de Fora e Praia Grande', foto:'fotos/p-tour360-3.jpg',
        txt:'O lado de fora da Ilha é o mar aberto: praias longas, ondas e quase ninguém. É o trecho em que a lancha navega mais ao largo, acompanhando a costa.',
        hist:'Da Praia Grande se caminha a pé até as Encantadas, na maré baixa. Pelo mar a mesma distância leva minutos.' },
      { t:'A ponta das Encantadas e a Gruta', foto:'fotos/p-tour360-4.jpg',
        txt:'Na ponta sul, o morro da Gruta das Encantadas cai direto no mar. A lancha se aproxima da gruta, que só se vê inteira por fora, do barco.',
        hist:'A lenda diz que sereias cantam na gruta nas noites de lua e encantam os pescadores. O nome da vila vem daí.' },
      { t:'Parada nas Encantadas', foto:'fotos/p-tour360-5.jpg',
        txt:'Tempo em terra na vila: praia de água calma, trapiche, bares na areia. Depois a lancha volta pela baía, fechando a volta completa na Ilha.',
        hist:'' }],
    saber:['O trecho de mar aberto pode balançar; em dias de ressaca a B12 faz o roteiro só pelo lado da baía.',
           'É o passeio mais fotogênico: leve o celular carregado.',
           'Bom para quem tem só um dia e quer ver a Ilha inteira.'] },

  { id:'galheta', nome:'Piscina Natural da Ilha da Galheta', dur:'3h', preco:150,
    foto:'fotos/ilha-galheta.jpg', cor:'#0F8A78',
    resumo:'Trilha curta e água calma, num lugar só de barco.',
    texto:'Travessia até a Ilha da Galheta, vizinha da Ilha do Mel, com tempo para banho na piscina natural entre as pedras e uma trilha curta.',
    saida:'Manhã ou tarde, conforme a maré, do trapiche da B12',
    inclui:['Marinheiro e lancha exclusiva','Coletes salva-vidas','Máscara de mergulho, se pedir na reserva'],
    leve:['Sapato que possa molhar, para as pedras','Protetor solar e água','Saco para o lixo: a ilha não tem coleta'],
    roteiro:[
      { t:'Saída de Pontal', foto:'fotos/p-galheta-1.jpg',
        txt:'Travessia curta, com a Ilha do Mel à esquerda o tempo todo. O horário é escolhido pela maré: a piscina natural aparece na maré baixa.',
        hist:'' },
      { t:'A piscina natural', foto:'fotos/p-galheta-2.jpg',
        txt:'Entre as pedras da ilha o mar forma uma piscina de água transparente e calma, sem onda. É o melhor lugar da região para ver peixes de máscara, mesmo para quem nunca mergulhou.',
        hist:'A Galheta é uma ilhota de pedra e mata na ponta sul, de frente para as Encantadas. Não tem moradores nem estrutura: o que se leva, se traz de volta.' },
      { t:'Trilha curta e vista', foto:'fotos/p-galheta-3.jpg',
        txt:'Uma trilha de poucos minutos sobe até um mirante com a Ilha do Mel inteira à frente. Depois, a volta a Pontal.',
        hist:'' }],
    saber:['Depende da maré e do mar: a B12 confirma o horário na véspera.',
           'Ótimo para crianças que já nadam; a água é rasa e sem correnteza na piscina.',
           'Não há sombra na ilha: chapéu é obrigatório.'] },
];

/* Tabela do briefing — SERVIÇO NÁUTICO PREMIUM (lancha exclusiva).
   O valor fixo de até 3 passageiros funciona como mínimo. A CONFIRMAR. */
B12.TABELA = {
  dia:   { de:'08h30', ate:'18h00', fixo:180, pessoa:50 },
  tarde: { de:'18h00', ate:'20h00', fixo:260, pessoa:65 },
  noite: { de:'20h00', ate:'22h00', fixo:310, pessoa:80 },
};
B12.REGULAR = 60;      /* travessia comum, por pessoa — PENDENTE de confirmação */
B12.DIARIA  = 40;      /* estacionamento por dia — média da planilha */
B12.DESC_DINHEIRO = 0.05;
B12.IDADE_CORTESIA = 5;

B12.DESTINOS = ['Brasília', 'Encantadas'];

B12.PARCEIROS = [
  { nome:'Villa Verde',          tipo:'restaurante', comissao:0 },
  { nome:'Grajagan Surf Resort', tipo:'resort',      comissao:0 },
  { nome:'Ilha do Mel Lodges',   tipo:'pousada',     comissao:0 },
  { nome:'Village Mel',          tipo:'pousada',     comissao:0 },
  { nome:'Bossa Beach House',    tipo:'pousada',     comissao:0 },
  { nome:'Surfway',              tipo:'pousada',     comissao:0 },
  { nome:'Pousada das Gêmeas',   tipo:'pousada',     comissao:0 },
  { nome:'Casa da Ilha do Mel',  tipo:'pousada',     comissao:0 },
  { nome:'Plancton',             tipo:'pousada',     comissao:0 },
  { nome:'Yba',                  tipo:'pousada',     comissao:0 },
  { nome:'13 Luas',              tipo:'pousada',     comissao:0 },
];

/* ------------------------------------------- a Ilha do Mel, lugar por lugar
   Fotos ilustrativas do Wikimedia Commons (créditos em B12.CREDITOS) até a
   B12 mandar as dela. 'vila' diz de que lado da Ilha o lugar fica. */
B12.LUGARES = [
  { id:'farol', nome:'Farol das Conchas', vila:'Brasília', foto:'fotos/ilha-farol.jpg', foto2:'fotos/ilha-trilha.jpg',
    resumo:'O cartão-postal da Ilha, com vista dos dois lados.',
    texto:'No alto do Morro das Conchas, o farol olha ao mesmo tempo para o mar aberto e para a baía. A subida é por uma escadaria entre a mata, e lá de cima se vê a Praia de Fora, a Praia do Farol e, nos dias limpos, a serra no continente.',
    hist:'Aceso pela primeira vez em 1872, no Segundo Reinado, o farol foi montado com uma torre de ferro fundida na Escócia e trazida de navio. Até hoje orienta quem entra na baía de Paranaguá.',
    como:'Trilha de uns 15 minutos a partir da Praia do Farol, em Brasília. Melhor no fim da tarde.' },
  { id:'forte', nome:'Fortaleza N. Sra. dos Prazeres', vila:'Brasília', foto:'fotos/ilha-forte.jpg',
    resumo:'Forte do século XVIII, tombado.',
    texto:'Muralhas brancas de pedra e cal na beira da praia, canhões apontados para a entrada da baía e um morro de mata fechada atrás. Dá para andar pelas muralhas e ver a serra do outro lado da água.',
    hist:'Construída entre 1767 e 1769 por ordem da Coroa portuguesa, para defender Paranaguá de invasões. Em 1850 seus canhões dispararam contra a corveta inglesa Cormorant, que perseguia navios negreiros: foi o único combate da fortaleza. É tombada pelo Iphan desde 1938.',
    como:'Caminhada de 40 minutos desde Brasília pela Praia da Fortaleza, ou de barco.' },
  { id:'gruta', nome:'Gruta das Encantadas', vila:'Encantadas', foto:'fotos/ilha-gruta.jpg', foto2:'fotos/ilha-gruta-2.jpg',
    resumo:'A lenda das sereias, na ponta sul.',
    texto:'Uma gruta aberta pelo mar na pedra, na ponta sul da Ilha. Uma passarela de madeira leva até a entrada; o mar bate lá dentro e o eco faz o resto.',
    hist:'A lenda diz que sereias cantam na gruta nas noites de lua e encantam os pescadores, que nunca mais voltam. Foi essa história que deu nome à vila das Encantadas.',
    como:'Trilha curta a partir da vila das Encantadas, 10 minutos. Não se entra na gruta: o mar é traiçoeiro.' },
  { id:'praiadefora', nome:'Praia de Fora', vila:'Brasília', foto:'fotos/ilha-praiadefora.jpg',
    resumo:'A praia aberta, boa para surfe.',
    texto:'Do lado do oceano, logo depois do farol: areia larga, ondas e quase ninguém. É a praia dos surfistas e de quem quer caminhar sem encontrar gente.',
    hist:'',
    como:'10 minutos a pé da Praia do Farol, contornando o morro. Cuidado com a correnteza.' },
  { id:'praiagrande', nome:'Praia Grande', vila:'as duas vilas', foto:'fotos/ilha-praiagrande.jpg',
    resumo:'A praia que liga Brasília às Encantadas.',
    texto:'A maior praia da Ilha, de mar aberto, ligando as duas vilas. Na maré baixa a caminhada de uma vila à outra leva cerca de uma hora, com o pé na água.',
    hist:'',
    como:'A pé, na maré baixa. Na maré alta, alguns trechos ficam sem areia: consulte a tábua de marés no app.' },
  { id:'limoeiro', nome:'Praia do Limoeiro', vila:'Brasília', foto:'fotos/ilha-limoeiro.jpg',
    resumo:'Água calma, de frente para o pôr do sol.',
    texto:'Virada para a baía, sem ondas, com água morna e rasa. É a praia das famílias com crianças e a melhor da Ilha para ver o sol se pôr atrás da serra.',
    hist:'',
    como:'5 minutos a pé do trapiche de Brasília.' },
  { id:'istmo', nome:'Istmo', vila:'Brasília', foto:'fotos/ilha-istmo.jpg',
    resumo:'O pedaço mais estreito da Ilha.',
    texto:'A faixa de areia que liga as duas metades da Ilha: mar dos dois lados, dunas e restinga no meio. Na maré baixa a água fica transparente e parada.',
    hist:'A Ilha do Mel são, na verdade, dois morros de pedra unidos por areia. O istmo é essa costura, e é por ele que se anda de uma metade à outra.',
    como:'Caminhada a partir da Praia do Limoeiro.' },
  { id:'galheta', nome:'Ilha da Galheta', vila:'de barco', foto:'fotos/ilha-galheta.jpg',
    resumo:'Piscina natural, só se chega pelo mar.',
    texto:'Ilhota de pedra e mata na ponta sul, sem moradores. Entre as pedras o mar forma uma piscina de água clara e sem onda, ótima para ver peixes de máscara.',
    hist:'',
    como:'Só de barco. A B12 faz o passeio de 3 horas, com horário pela maré.', passeio:'galheta' },
  { id:'encantadas', nome:'Vila das Encantadas', vila:'Encantadas', foto:'fotos/ilha-encantadas.jpg',
    resumo:'Trapiche, bares na areia e praia calma.',
    texto:'A vila do sul: menor e mais tranquila, com casas coloridas entre a mata, bares com mesa na areia e a praia de água calma de frente para o trapiche.',
    hist:'',
    como:'É um dos dois destinos da travessia da B12.' },
  { id:'brasilia', nome:'Vila de Brasília', vila:'Brasília', foto:'fotos/ilha-brasilia.jpg',
    resumo:'A vila maior, com o trapiche principal.',
    texto:'Onde a maioria chega: pousadas, restaurantes, o posto de saúde e o começo das trilhas para o Farol e para a Fortaleza. Os barcos de pesca ficam na areia, em frente ao trapiche.',
    hist:'Não entram carros na Ilha, e o número de visitantes por dia é limitado. É por isso que ela continua assim.',
    como:'É o outro destino da travessia da B12.' },
];

/* onde comer e onde ficar: textos de exemplo, editáveis pela B12 no painel */
B12.COMER = [
  { nome:'Bares na areia', vila:'Encantadas', foto:'fotos/ilha-comer-1.jpg',
    txt:'Mesa com o pé na areia, peixe do dia e o pôr do sol de graça.' },
  { nome:'Restaurantes das vilas', vila:'Brasília e Encantadas', foto:'fotos/ilha-comer-2.jpg',
    txt:'Casas de família com moqueca, camarão e a tainha da época. A B12 indica os parceiros.' },
];
B12.FICAR = [
  { nome:'Pousadas entre a mata', foto:'fotos/ilha-ficar-1.jpg',
    txt:'Casas de madeira colorida, a poucos passos da praia. Reserve antes: nos feriados a Ilha lota.' },
  { nome:'Hospedagem parceira', foto:'fotos/ilha-ficar-2.jpg',
    txt:'A B12 trabalha com as pousadas abaixo. Quem reserva pelo app pode escolher a pousada na hora.' },
];

B12.CREDITOS = [
  {a:"ilha-heroi.jpg", autor:"Cyrus Augustus Moro Daldin", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Praia_do_Farol.jpg"},
  {a:"ilha-farol.jpg", autor:"Cyrus Augustus Moro Daldin", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Farol_das_Conchas.jpg"},
  {a:"ilha-forte.jpg", autor:"Cyrus Daldin", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AFortaleza_de_Nossa_Senhora_dos_Prazeres_de_Paranagu%C3%A1_-_Ilha_do_Mel.jpg"},
  {a:"ilha-gruta.jpg", autor:"MTur Destinos", lic:"Public domain", url:"https://commons.wikimedia.org/wiki/File%3ARenato_Soares_Ilha_do_Mel_Gruta_das_Encantadas_Paranagua_PR_%2840667917555%29.jpg"},
  {a:"ilha-gruta-2.jpg", autor:"Rodrigo Zini", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_mel_no_Paran%C3%A1_III.jpg"},
  {a:"ilha-praiadefora.jpg", autor:"Erica Oguido", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3APraia_de_Fora_da_Ilha_do_Mel.jpg"},
  {a:"ilha-praiagrande.jpg", autor:"PattiMorais", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3APraia_de_Fora_e_Praia_Grande_-_Ilha_do_Mel.JPG"},
  {a:"ilha-galheta.jpg", autor:"Gabriel Vissoto gabrielvissoto", lic:"CC0", url:"https://commons.wikimedia.org/wiki/File%3AHoney_Island_-_Brazil_%28Unsplash%29.jpg"},
  {a:"ilha-istmo.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIstmo_da_Ilha_%2818483758702%29.jpg"},
  {a:"ilha-limoeiro.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AFinal_de_tarde_na_Praia_do_Limoeiro_%2818019657784%29.jpg"},
  {a:"ilha-encantadas.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851317746169%29.jpg"},
  {a:"ilha-brasilia.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3ANova_Brasilia_%2818269903770%29.jpg"},
  {a:"ilha-trilha.jpg", autor:"Everton.photography", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Praia_de_Fora_01.jpg"},
  {a:"ilha-comer-1.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851318031380%29.jpg"},
  {a:"ilha-comer-2.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851317020886%29.jpg"},
  {a:"ilha-ficar-1.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851317232218%29.jpg"},
  {a:"ilha-ficar-2.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851317748314%29.jpg"},
  {a:"travessia.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3ADo_Pontal_a_Ilha_%2818419515261%29.jpg"},
  {a:"p-golfinhos.jpg", autor:"\u00cdcaro Gimenez", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3ABoto-Cinza_%28Sotalia_guianensis%29_-_panoramio.jpg"},
  {a:"p-golfinhos-1.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3ADo_Pontal_a_Ilha_%2818419493071%29.jpg"},
  {a:"p-golfinhos-2.jpg", autor:"Jo\u00e3o D'Andretta", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AParque_Estadual_do_Lagamar_de_Canan%C3%A9ia_-_Jo%C3%A3o_Paulo_Marques_DAndretta_%2812%29.jpg"},
  {a:"p-golfinhos-3.jpg", autor:"Sofia Prado", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3AFim_de_tarde_na_ilha_das_pe%C3%A7as_-_Paran%C3%A1_-_Brasil_-_panoramio.jpg"},
  {a:"p-golfinhos-4.jpg", autor:"Sofia Prado", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_das_pe%C3%A7as_-_paran%C3%A1_-_Brasil_-_panoramio.jpg"},
  {a:"p-sebui.jpg", autor:"Lichinga", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AAPA_Guaraque%C3%A7aba_-_Baia_dos_Pinheiros_01.JPG"},
  {a:"p-sebui-1.jpg", autor:"Lichinga", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_dos_Pinheiros.jpg"},
  {a:"p-sebui-2.jpg", autor:"Lichinga", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AAPA_Guaraque%C3%A7aba_-_Sebui_elevated_path.JPG"},
  {a:"p-sebui-3.jpg", autor:"Lichinga", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AAPA_Guaraque%C3%A7aba_-_Canale_nella_riserva_del_Sebui.JPG"},
  {a:"p-sebui-4.jpg", autor:"Adelfo Sopran", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3ABase_da_queda_d%27%C3%A1gua_de_Salto_Morato_em_Guaraque%C3%A7aba_%28PR%29.jpg"},
  {a:"p-tour360.jpg", autor:"Cyrus Daldin", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AFarol_da_Ilha_do_Mel.jpg"},
  {a:"p-tour360-1.jpg", autor:"Deyvid Setti e Eloy Olindo Setti", lic:"CC BY 3.0", url:"https://commons.wikimedia.org/wiki/File%3AFortaleza_de_Nossa_Senhora_dos_Prazeres.jpg"},
  {a:"p-tour360-2.jpg", autor:"Kendy Fujita", lic:"CC BY-SA 3.0", url:"https://commons.wikimedia.org/wiki/File%3AParque_Estadual_Ilha_do_Mel.jpg"},
  {a:"p-tour360-3.jpg", autor:"Everton.photography", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Praia_de_Fora_03.jpg"},
  {a:"p-tour360-4.jpg", autor:"Cyrus Augustus Moro Daldin", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Morro_da_Gruta_das_Encantadas.jpg"},
  {a:"p-tour360-5.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIlha_do_Mel_-_Encantadas_%2851317747059%29.jpg"},
  {a:"p-galheta-1.jpg", autor:"Marcos Guerra", lic:"Public domain", url:"https://commons.wikimedia.org/wiki/File%3AEmbarca%C3%A7%C3%A3o_ilha.JPG"},
  {a:"p-galheta-2.jpg", autor:"Ot\u00e1vio Nogueira from Fortaleza, BR", lic:"CC BY 2.0", url:"https://commons.wikimedia.org/wiki/File%3AIstmo_da_Ilha_%2818461655186%29.jpg"},
  {a:"p-galheta-3.jpg", autor:"Marceloferreirassis", lic:"CC BY-SA 4.0", url:"https://commons.wikimedia.org/wiki/File%3AEscadaria_do_Farol_2.jpg"}
];


/* ------------------------------- categorias do financeiro (lista do briefing) */
B12.ENTRADAS = ['Travessias','Passeios','Estacionamento','Comissões de hospedagem','Outras receitas'];
B12.SAIDAS   = ['Combustível','Manutenção','Operação/marinheiros','Impostos e taxas',
                'Despesas administrativas','Compras e fornecedores','Outras despesas'];
B12.CENTROS  = ['Lancha','Receptivo B12','Estacionamento','Administrativo'];

/* taxas de maquininha — valores de mercado, o cliente precisa confirmar as dele */
B12.TAXAS = { credito:0.0349, debito:0.0189, pix:0, dinheiro:0 };

/* contas fixas citadas no briefing */
B12.CONTAS_FIXAS = [
  { desc:'Salário marinheiro',   valor:2900, dia:5,  cat:'Operação/marinheiros',    centro:'Lancha' },
  { desc:'Aluguel Estação B12',  valor:3500, dia:10, cat:'Despesas administrativas',centro:'Receptivo B12' },
  { desc:'Contador',             valor:650,  dia:10, cat:'Despesas administrativas',centro:'Administrativo' },
  { desc:'DAS',                  valor:1180, dia:20, cat:'Impostos e taxas',        centro:'Administrativo' },
  { desc:'Água e luz',           valor:740,  dia:15, cat:'Despesas administrativas',centro:'Receptivo B12' },
  { desc:'Ambev',                valor:1450, dia:12, cat:'Compras e fornecedores',  centro:'Receptivo B12' },
  { desc:'Produtos de limpeza',  valor:380,  dia:12, cat:'Compras e fornecedores',  centro:'Receptivo B12' },
  { desc:'Empanadas',            valor:620,  dia:8,  cat:'Compras e fornecedores',  centro:'Receptivo B12' },
];

B12.EMBARCACOES = [
  { id:'l01', nome:'Lancha 01', capacidade:12, ativa:true, motor:'225 HP' },
];

/* ============================================================================
   HISTÓRICO REAL — planilha do cliente
   ========================================================================== */

/* [ano-mês, lançamentos, passageiros, receita travessia, receita estacionamento] */
B12.HIST_VENDAS = [
["2015-08",158,593,9400,0],["2015-09",208,602,10894,2115],["2015-10",274,988,16648,2585],
["2015-11",224,655,10668,1920],["2015-12",306,891,16383,6418],["2016-01",332,1191,23618,6615],
["2016-02",263,884,18940,5365],["2016-03",216,654,11975,4440],["2016-04",243,851,15205,2865],
["2016-05",123,307,4555,1045],["2016-06",118,298,3780,1020],["2016-07",210,496,8535,1825],
["2016-08",177,481,6635,2710],["2016-09",210,555,9095,2670],["2016-10",171,581,10515,2300],
["2016-11",221,614,10260,3095],["2016-12",326,1122,19465,7710],["2017-01",271,1007,17130,5235],
["2017-02",334,1028,20860,6835],["2017-03",231,798,15265,4030],["2017-04",254,903,16895,3420],
["2017-05",56,173,3395,725],["2017-06",23,0,0,850],["2017-07",172,530,8610,2155],
["2017-08",220,597,8385,2335],["2017-09",223,618,10905,2965],["2017-10",143,462,7845,1410],
["2017-11",273,756,13020,3865],["2017-12",278,843,15830,7080],["2018-01",362,1119,22300,7205],
["2018-02",273,894,18650,5600],["2018-03",207,691,14435,4305],["2018-04",210,625,11280,3045],
["2018-05",19,58,1355,0],["2018-10",10,26,590,310],["2018-11",131,417,9990,1670],
["2018-12",82,240,6990,715],["2019-02",2,7,150,0],["2019-03",127,333,6900,1530],
["2019-04",121,283,7475,1410],["2019-05",123,302,7235,945],["2019-06",141,392,9970,1680],
["2019-07",136,384,9459,1525],["2019-08",24,75,1675,865],["2019-12",4,11,325,290],
["2020-12",113,674,29065,12785],["2021-01",116,729,32390,9565],["2021-02",125,561,25150,8575],
["2021-03",30,124,7913,2155],["2021-06",70,280,12293,5190],["2021-07",59,282,12223,4066],
["2021-08",48,315,12530,4058],["2021-09",117,732,30682,9620],["2021-10",71,319,15700,6040],
["2021-11",140,624,29345,10196],["2021-12",190,1187,57490,25135],["2022-01",117,769,36191,12994],
["2024-02",97,466,25562,11695],["2024-03",132,662,35660,11950],["2024-04",102,507,25195,10055],
["2024-05",64,306,15680,5680],["2024-06",63,205,13860,5856],["2024-07",52,230,13270,4280],
["2024-08",187,853,42115,17917],["2024-09",69,350,21405,6060],["2024-10",92,512,25430,10435],
["2024-11",100,449,25310,9855],["2024-12",167,919,52015,29272],["2025-01",232,1170,68470,31810],
["2025-02",143,655,37571,17090],["2025-03",163,710,45390,19170],["2025-04",71,355,21220,8790],
["2025-05",73,354,19305,6880],["2025-06",30,119,7460,2400],["2025-07",79,283,19180,6990]
];

/* [ano-mês, R$, litros, abastecimentos] — 712 lançamentos, 50.784 L, R$ 213.436 */
B12.HIST_COMBUSTIVEL = [
["2016-04",3953,998,16],["2016-05",1578,399,8],["2016-06",1884,477,13],["2016-07",2992,757,21],
["2016-08",2709,686,15],["2016-09",2888,731,17],["2016-10",2934,743,17],["2016-11",3403,862,18],
["2016-12",4411,1098,22],["2017-01",4408,1100,23],["2017-02",5506,1380,31],["2017-03",3989,1000,24],
["2017-04",4327,1084,26],["2017-05",403,101,3],["2017-07",3833,961,18],["2017-08",4381,1098,27],
["2017-09",4314,1037,22],["2017-10",3112,741,21],["2017-11",4667,1112,27],["2017-12",6874,1604,35],
["2018-01",7446,1635,32],["2018-02",5930,1302,25],["2018-03",5402,1186,27],["2018-04",4966,1088,24],
["2018-05",375,81,2],["2018-10",300,62,1],["2018-11",2873,592,13],["2018-12",740,153,4],
["2019-06",200,43,1],["2021-10",3387,0,3]
];
B12.COMB_TOTAL = { linhas:712, litros:50784, valor:213436, precoLitro:4.20 };

/* [ano-mês, R$] — 443 lançamentos, R$ 236.570 */
B12.HIST_DESPESAS = [
["2016-08",3815],["2016-09",2093],["2016-10",1770],["2016-11",1804],["2016-12",3932],
["2017-01",9609],["2017-02",4456],["2017-03",1682],["2017-04",4483],["2017-05",5538],
["2017-06",4821],["2017-07",4451],["2017-08",4372],["2017-09",4691],["2017-10",4448],
["2017-11",3543],["2017-12",4451],["2018-01",5412],["2018-02",4828],["2018-03",3690],
["2018-04",3652],["2018-11",7010],["2018-12",1213],["2019-03",23500],["2019-04",3440],
["2019-06",400],["2019-07",2128],["2019-08",2326],["2021-05",50],["2021-06",1508]
];

/* maiores despesas nomeadas na planilha — usado no relatório de despesas */
B12.DESP_MAIORES = [
  ['Salário marinheiro',26650],['Aluguel Estação B12',21000],['Celular',4995],
  ['Lavagem da lancha',4350],['Marina Michel (4× lavagem)',4050],
  ['Peças, o-rings, retentores, óleos',3305],['GPS',2560],['Toldo',2500],['Guincho',2200],
  ['Óleos, filtros, correia dentada',2083],['Sinal do motor 225 HP',2000],
  ['Mão de obra lancha',3700]
];

/* origem do cliente, como está na planilha (a coluna "Cliente") */
B12.HIST_ORIGEM = [
  ['Direto (b12)',3719],['Náutico',2301],['Turista avulso',1702],['Hóspede de pousada',1635],
  ['Astral',1155],['Pacote Astral',615],['Grajagan',132],['Casamento',53],['Plancton',29],
  ['Yba',25],['Ilha do Mel Lodges',17],['Bossa',15],['13 Luas',14],['Village Mel',11]
];

B12.HIST_PAGAMENTO = [['credito',1277],['debito',436],['pix',339],['dinheiro',303],['transferencia',9]];
B12.HIST_FAIXAS    = [['08h-18h',9626],['18h-20h',1008],['20h-22h+',490],['antes 08h',186]];
B12.HIST_PAX       = [[1,3466],[2,1791],[3,879],[4,2095],[5,445],[6,816],[7,216],[8,606],
                      [9,123],[10,180],[11,67],[12,100]];

B12.HIST_RESUMO = {
  lancamentos:12267, passageiros:41090, receita:1741819,
  primeiro:'2015-08', ultimo:'2025-07',
  mesesComRegistro:75, mesesEmBranco:45, anoFaltando:2023,
  semDataValida:913
};

/* ============================================================================
   Movimento do mês corrente — GERADO a partir da sazonalidade real.
   Serve para o painel ter o que mostrar. Toda tela avisa que é demonstração.
   ========================================================================== */
B12.gerarMes = function (ano, mes) {
  /* peso sazonal tirado da média real de 2024-2025 por mês do ano */
  var peso = [1.00,.62,.66,.38,.30,.20,.28,.42,.33,.40,.40,.85][mes-1];
  var baseMes = 82000 * peso;                       /* receita típica do mês */
  var dias = new Date(ano, mes, 0).getDate();
  var sem = new Date(ano, mes-1, 1).getDay();
  var out = [], semente = ano*100+mes;
  function rnd(){ semente = (semente*9301+49297) % 233280; return semente/233280; }
  for (var d=1; d<=dias; d++){
    var dw = (sem + d - 1) % 7;
    var fds = (dw===5||dw===6||dw===0) ? 1.85 : 0.62;   /* fim de semana pesa mais */
    var r = baseMes/dias * fds * (0.72 + rnd()*0.56);
    var pax = Math.max(2, Math.round(r/58));
    out.push({
      dia:d,
      travessias: Math.max(1, Math.round(pax/3.4)),
      pax: pax,
      travessia: Math.round(r*0.70),
      estacionamento: Math.round(r*0.22),
      passeios: Math.round(rnd()*3*fds),
      passeio: Math.round(r*0.08),
      combustivel: Math.round(r*0.155)      /* 15,5% da receita, média real */
    });
  }
  return out;
};
