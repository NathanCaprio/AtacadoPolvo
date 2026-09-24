/* =========================================================================
   ATACADO POLVO - Configuração central do site
   -------------------------------------------------------------------------
   Este é o ÚNICO arquivo que precisa ser editado para trocar os dados de
   contato da loja. Os valores abaixo são injetados no HTML em tempo de
   execução (ver assets/js/main.js -> aplicarConfig), sobrescrevendo o
   texto que está escrito nas páginas.

   No HTML, os ganchos são:
     data-site="telefone"     -> troca o texto do elemento
     data-wpp="mensagem"      -> vira um link de WhatsApp com essa mensagem
     data-tel / data-mail     -> viram tel: e mailto:
     data-insta               -> link do Instagram
     data-endereco-full       -> endereço completo montado
     data-ano                 -> ano atual

   Os campos marcados com CONFERIR ainda não foram confirmados: eles não
   constam no Instagram e continuam com valor de exemplo.
   ========================================================================= */

window.SITE = {
  nome: 'Atacado Polvo',
  marcaLinha1: 'Atacado da Limpeza',
  marcaLinha2: 'Polvo',
  slogan: 'Precisa de uma mãozinha extra?',

  // --- Contato -------------------------------------------------------------
  whatsapp: '5551980256547',          // somente números, com DDI + DDD
  whatsappLabel: '(51) 98025-6547',
  telefone: '(51) 98025-6547',
  telefoneLink: '+5551980256547',
  email: 'contato@atacadopolvo.com.br',   // CONFERIR

  // --- Endereço (loja principal) -------------------------------------------
  endereco: 'Av. Dr. Carlos Barbosa, 931',
  bairro: 'Medianeira',
  cidade: 'Porto Alegre',
  uf: 'RS',
  cep: '',                                 // CONFERIR

  // --- Segunda unidade ------------------------------------------------------
  endereco2: 'Av. Bento Gonçalves, 5928',
  bairro2: '',                             // CONFERIR (bairro da Av. Bento Gonçalves)
  cidade2: 'Porto Alegre',
  uf2: 'RS',

  // --- Institucional --------------------------------------------------------
  razaoSocial: 'Atacado Polvo',            // CONFERIR (razão social completa)
  cnpj: '00.000.000/0001-00',              // CONFERIR
  fundacao: 2015,                          // CONFERIR

  // --- Horários -------------------------------------------------------------
  horarioSemana: 'Segunda a sexta, 08h às 18h',
  horarioSabado: 'Sábado, 09h às 15h',

  // --- Redes ----------------------------------------------------------------
  instagram: 'https://www.instagram.com/atacadopolvo/',
  instagramHandle: '@atacadopolvo',

  // --- Regras comerciais ----------------------------------------------------
  pedidoMinimo: 'R$ 300,00',               // CONFERIR
  raioEntrega: 'Porto Alegre e Região Metropolitana',

  // Mensagem padrão aberta no WhatsApp quando data-wpp vem vazio
  mensagemPadrao: 'Olá! Vim pelo site e gostaria de fazer um orçamento.'
};
