/* =========================================================================
   ATACADO POLVO - Página de pedido recorrente

   Os botões dos planos levam ao formulário (#cotacao) já com o plano
   escolhido marcado no <select>, para a pessoa não ter de escolher duas
   vezes. Os percentuais de desconto vêm de config.js (data-site).
   ========================================================================= */
(function () {
  'use strict';

  const select = document.getElementById('lead-plano');
  if (!select) return;

  document.querySelectorAll('[data-plano]').forEach(botao => {
    botao.addEventListener('click', () => {
      select.value = botao.dataset.plano;
    });
  });
})();
