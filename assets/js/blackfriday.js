/* Contagem regressiva da Black Friday. Data-alvo única, editável aqui.
   Ajuste BF_ALVO quando definir o dia real da campanha. */
(function () {
  var BF_ALVO = new Date('2026-11-27T00:00:00-03:00').getTime();
  var elDias = document.querySelector('[data-bf-dias]');
  var elHoras = document.querySelector('[data-bf-horas]');
  var elMin = document.querySelector('[data-bf-min]');
  var elSeg = document.querySelector('[data-bf-seg]');
  var elFaixaData = document.querySelector('[data-bf-faixa-data]');
  if (elFaixaData) {
    elFaixaData.textContent = new Date(BF_ALVO).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function atualizar() {
    var diff = BF_ALVO - Date.now();
    if (diff <= 0) {
      elDias.textContent = elHoras.textContent = elMin.textContent = elSeg.textContent = '00';
      return;
    }
    var dias = Math.floor(diff / 86400000);
    var horas = Math.floor((diff % 86400000) / 3600000);
    var min = Math.floor((diff % 3600000) / 60000);
    var seg = Math.floor((diff % 60000) / 1000);
    elDias.textContent = pad(dias);
    elHoras.textContent = pad(horas);
    elMin.textContent = pad(min);
    elSeg.textContent = pad(seg);
  }
  atualizar();
  setInterval(atualizar, 1000);
})();
