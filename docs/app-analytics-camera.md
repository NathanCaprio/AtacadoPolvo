# App de analytics por câmera — ideia em pausa

> Ideia de 28/10/2026: um app (Agrada Digital) que usa o CFTV da loja física para medir o fluxo em cada corredor e, cruzando com vendas, margem e mapa produto→corredor, mostrar quais corredores dão mais lucro. Piloto nas lojas físicas do Atacado Polvo. Relatório completo abaixo.

## Status e pendências

Já confirmado:
- O cliente é o Atacado da Limpeza Polvo (CNPJ 37.418.777/0001-80), lojas na Av. Dr. Carlos Barbosa, 931 e na Av. Bento Gonçalves, 5928, em Porto Alegre (`assets/js/config.js`).
- O ERP é o Empresarius (WME Sistemas), sem API pública, com a sincronização do site desligada desde 02/10/2026 (ver `INTEGRACAO-ERP.md`). As vendas para o app provavelmente terão de vir de exportação CSV de cupons, não de API.

Falta:
1. Perguntar ao Polvo:
   - autosserviço ou balcão; área; número de caixas; fluxo diário;
   - câmeras/NVR, instalador, RTSP e rede;
   - se o Empresarius/PDV exporta cupom por SKU com hora, custo e canal;
   - % da receita na loja física;
   - verbas, quebras e aluguel;
   - responsável pela LGPD.
2. Decidir build vs buy da contagem (câmera Intelbras com IA pronta vs agente próprio) e quem desenvolve: precisa de alguém de visão computacional/edge e de um parceiro instalador de CFTV.
3. Validar a disposição a pagar com o Polvo e com 3–5 clientes da base da Agrada antes de construir a versão multi-cliente.
4. Buscar um 2º piloto em mercado ou atacarejo de autosserviço de verdade.

---

# App de analytics de loja física por câmera: síntese para decidir a construção (28/10/2026)

## Resposta curta

**Dá para construir, com uma ressalva que define o produto: a câmera mede fluxo e atenção, não lucro.** Ela conta passagens por zona, paradas, tempo de permanência e fila. O lucro só aparece quando esses números são cruzados com:
- o **PDV/ERP**, com cupom por SKU, horário e canal;
- a **margem por SKU**, de preferência já com verbas e rebates de fornecedor e com as quebras;
- um **mapa SKU → zona** com data de vigência;
- o **custo de ocupação** (R$/m²), para ir de margem a contribuição.

**O produto que se vende é esse cruzamento.** A contagem pura já vem pronta em câmeras Intelbras e Hikvision. Por isso vale considerar um MVP que **compre a contagem e construa o cruzamento** (ver Roadmap).

**O primeiro cliente muda o escopo.** O atacadopolvo.com.br é o "Atacado da Limpeza Polvo" (CNPJ 37.418.777/0001-80), que roda na Tray ([site](https://www.atacadopolvo.com.br/)):
- atacado de limpeza, descartáveis e utensílios que **vende a PJ e a PF**;
- 2 lojas em Porto Alegre;
- entrega própria, venda online, WhatsApp, retirada na loja e app de entrega.

Não é um atacarejo de porte médio. Serve como laboratório barato, mas é um case fraco para vender a supermercados.

## O produto

**O que faz.** Um agente instalado na loja lê o CFTV que já existe e conta pessoas que cruzam linhas na entrada e na boca de cada zona (corredor, ponta, área de ofertas, balcão/caixa). Para a nuvem vão só números agregados. O painel web cruza esses números com vendas e margem e entrega:
- margem e contribuição por visitante de cada zona;
- conversão da loja;
- fila e espera;
- comparação antes/depois com grupo de controle;
- relatório semanal em português.

**Para quem.** Varejo pequeno e médio e redes regionais com CFTV Intelbras ou Hikvision: mercados e atacarejos regionais, vestuário (a Roupas Térmicas é um exemplo) e franquias. Em 2016, o então presidente da FX estimava que só cerca de 5% das lojas brasileiras usavam esse tipo de solução ([Baguete](https://www.baguete.com.br/noticias/sabini-e-novo-presidente-da-fx)). O dado é antigo e não achei número atual.

**Diferenciais:**
- usa a câmera que já existe;
- instala em 1 dia;
- **cruza com PDV/ERP e com a Tray**, que é o canal natural da Agrada;
- preço em R$ por loja;
- **sem nenhuma inferência sobre o rosto**, o que vira argumento de LGPD.

## Como funciona

1. **Captura.** A captura roda num mini PC (Intel N100 com OpenVINO, ou um PC que a loja já tenha) ou, em loja com mais de 8 câmeras, num Jetson Orin Nano Super.
   - Lê o RTSP do NVR com um usuário só de leitura. A porta 554 nunca fica exposta.
   - **Resolução e FPS são parâmetros do piloto:** comparar o substream a ~6 fps com o main stream 1080p a ~12 fps na validação manual e escolher pelo erro medido. FPS baixo aumenta a troca de ID.
   - Requisitos de rede: uplink estável, acesso à VLAN das câmeras e contato do instalador.
2. **Detecção e rastreamento.**
   - Detector de pessoas: RF-DETR Nano/Small (Apache-2.0) ou YOLO com licença Enterprise.
   - Tracker: `ByteTrackTracker` do pacote `trackers`.
   - Linhas e zonas: `supervision` (`LineZone`, `PolygonZone`). O `sv.ByteTrack` foi removido na 0.31.0 ([changelog](https://supervision.roboflow.com/latest/changelog/)).
3. **Agregação em memória.**
   - **T_c (visitas à zona) = cruzamentos de entrada na linha da boca da zona**, com janela de deduplicação. Não se usa ocupação de polígono, porque corredor longo gera troca de ID e infla a contagem.
   - Paradas e permanência saem de um polígono complementar.
   - As janelas fecham a cada 15 min. IDs e quadros são descartados e **nenhuma imagem é gravada**.
   - Se a internet cair, os dados esperam numa fila local em SQLite.
4. **Nuvem multi-cliente.**
   - Ingestão, Postgres/Timescale isolado por cliente e saúde das câmeras (stream caiu, imagem preta, câmera deslocada).
   - Editor de zonas sobre um snapshot **capturado com a loja fechada**, borrado na borda, conferido antes do envio e apagado depois de salvar a configuração. Esse fluxo fica documentado no RIPD.
5. **Vendas.**
   - **v0:** o cliente envia CSVs de cupons (data, hora, cupom, SKU, quantidade, preço, desconto, **canal**, CPF/CNPJ sim/não), custos e verbas, planograma por **categoria** com vigência e aluguel/m².
   - **v1:** conectores de ERP/PDV e Tray.
6. **Painel.** PWA responsiva e alertas por WhatsApp ou e-mail.

## Métricas que o painel entrega

**Notação.** V = entradas na loja; T_c = visitas à zona c (cruzamentos de linha, corrigidos por fator de calibração da zona).

**Regra de atribuição.** MB_c = margem bruta **só de cupons presenciais de autosserviço** com SKUs mapeados para c. Ficam de fora do numerador:
- entrega;
- WhatsApp;
- online;
- encomenda;
- balcão com busca no estoque.

Pedidos de retirada contam como visita à zona de retirada, não como venda de gôndola.

**Métricas:**
- **Captura** = T_c / V. Equivale à "Exposure Rate" da RetailNext ([glossário](https://retailnext.atlassian.net/wiki/spaces/PUBLICDOCS/pages/144867353/Metrics+Glossary); página não reverificada). Só aparece quando o erro medido da zona for de 15% ou menos.
- **Taxa de parada** = paradas de X s ou mais / T_c.
- **Índice de conversão da zona** = cupons presenciais com SKU da zona / T_c. Aparece **como índice relativo entre zonas**, não como %, porque o cupom é do grupo e a visita é da pessoa.
- **MB por visitante da loja** = MB_c / V = Captura × (MB_c / T_c). **É a métrica central.** Ela decompõe o resultado em alcance × produtividade. Só um rodízio de posição (ABBA) ou uma diferença-em-diferenças separa o efeito do lugar do efeito da categoria.
- **Contribuição da zona** = MB_c + verbas/rebates atribuídos − quebras/vencimentos − aluguel/m² × m² da zona. O painel mostra **dois rankings**: MB por visitante e contribuição por m². Num atacarejo, a margem bruta gira em torno de 16–17% (estimativa a partir dos resultados do Assaí). Com margem desse tamanho, verbas e quebras podem inverter o ranking.
- **Outras:** GMROI = MB / estoque médio a custo; conversão da loja = cupons / entradas, por hora; fila e espera por caixa ou balcão.

**Exemplo ilustrativo** (todos os números são fictícios):

| Zona | Visitas | Captura | Parada | MB R$ | MB/visita zona | MB/visitante loja |
|---|---|---|---|---|---|---|
| Ponta de entrada (promo) | 2.160 | 90% | 35% | 5.832 | 2,70 | 2,43 |
| Corredor núcleo | 1.320 | 55% | 60% | 24.750 | 18,75 | 10,31 |
| Corredor do fundo | 480 | 20% | 70% | 20.275 | 42,24 | 8,45 |
| Categoria destino | 240 | 10% | 80% | 6.912 | 28,80 | 2,88 |

**Como ler:** a ponta de entrada tem o maior tráfego e a pior margem por visita, e esse tráfego vem da porta. O fundo tem pouco tráfego e margem alta por visita. Isso é candidato a teste de posição, não uma conclusão.

## Concorrência e modelo de negócio

**Concorrentes e substitutos:**
- **Câmeras com analítico embarcado (a ameaça barata):**
  - Intelbras VIP 7550 Z IA FT: contagem, fila e mapa de calor, com relatório de até 1 semana ([datasheet](https://backend.intelbras.com/sites/default/files/2026-05/Datasheet%207550%20BD%20Z%20IA%20%20FT%20-%20V018_0.pdf)).
  - VIP 7250 IA: contagem e mapa de calor segundo a Intelbras; **fila não confirmada**.
  - Hikvision DS-2CD6825G0/C-IVS (lente dupla, descontinuada pela Hikvision): R$ 4.600,26 no Pix em revenda, sem data ([Planeta Energia](https://www.planetaenergia.com.br/produto/camera-ip-2mp-contagem-pessoas-ds-2cd6825g0-c-ivs-hikvision-168)).
  - Nenhuma delas cruza com venda ou margem nem consolida várias lojas.
- **Brasil:** FX Retail Analytics, Riverdata/RivIA (IA sobre CFTV, cliente Profarma), Visio.AI (seed de R$ 12 mi em mar/2024; franquias de alimentação; cruza vídeo e venda), Ouran, Seed Digital, Claro Contador de Fluxo, Bosch INSTA, Ipsos. **Preço sob consulta em todos.**
- **Fora do Brasil:**
  - Dor: US$ 300 por sensor mais US$ 135–150/mês ([getdor.com](https://www.getdor.com/compare/best-people-counters)).
  - RetailNext e ShopperTrak: contratos corporativos.
  - V-Count: as fontes divergem.

**Modelo proposto** (tudo **estimativa**):
- Setup: R$ 1.500–4.000/loja.
- Mensalidade: R$ 290–590/loja com até 4 câmeras, mais R$ 50–90 por câmera extra.
- **Hardware padrão:** mini PC N100 (R$ 1.500–2.500, sem preço do Brasil encontrado) **cobrado à vista** ou embutido no setup.
- **Jetson** (R$ 4.300–8.000 no varejo BR, preço não reverificado; US$ 249 nos EUA): só para lojas grandes. Em comodato, amortizado em 12 meses, ele consome R$ 360–670/mês e a conta não fecha.
- **Unit economics** (estimativa): mensalidade − nuvem (R$ 15–60) − horas de campo e suporte. A margem de 70–85% só se sustenta com **no máximo 2 h de operação por loja/mês**, e o piloto deve consumir 8–20 h/mês. É preciso medir o payback por loja: hardware + instalação + horas de campo contra a mensalidade.
- **Canal:** base de e-commerce da Agrada e instaladores de CFTV com comissão recorrente.
- **Antes de construir o multi-cliente:** validar a disposição a pagar com o Polvo e com 3–5 varejistas da base.

## Riscos técnicos, de licença e LGPD

**Técnicos:**
- **A precisão em CFTV angulado é bem menor que a anunciada.** Com YOLOv3 + DeepSORT em câmera já instalada, um estudo teve 82,8% de acerto sem lotação e 66,2% no geral ([Cruz et al., 2020](https://animorepository.dlsu.edu.ph/faculty_research/14064)). Os fabricantes anunciam 95–98%.
- **O rastreador troca IDs com frequência.** Os rastreadores têm IDF1 de 77–80% no MOT17, um benchmark de rua. Serve para estatística agregada, não para jornada individual.
- **O erro varia com a geometria da zona,** então é preciso calibrar e validar zona a zona.
- **Detectar a mão pegando produto** ainda é pesquisa. Fica fora do MVP.

**Licença:**
- **Ultralytics YOLO é AGPL-3.0.** Uso interno e modelos treinados exigem a licença Enterprise, com preço sob consulta ([ultralytics.com/license](https://www.ultralytics.com/license)).
- **RF-DETR:** só os tamanhos **Nano, Small, Medium e Large são Apache-2.0** ([Roboflow](https://blog.roboflow.com/rf-detr-is-free-to-use-commercially/)). Atto/Femto/Pico, XL, 2XL e o `rfdetr_plus` usam a PML 1.0 ([GitHub](https://github.com/roboflow/rf-detr)).
- **Outras opções permissivas:** YOLOX, RTMDet, RT-DETR e D-FINE.
- **Bibliotecas de apoio:** `supervision` (MIT) e `trackers` (Apache-2.0). Conferir a licença de cada checkpoint.

**LGPD (não é parecer jurídico; validar com advogado):**
- A imagem já é dado pessoal. Biometria é dado sensível (art. 5º II) e não admite legítimo interesse.
- **Contagem de corpos, na borda e só agregada:** base de legítimo interesse, com teste de balanceamento. **Risco baixo, sem precedente específico.**
- **Atributos do rosto (idade, gênero, emoção): risco alto.**
  - **ViaQuatro:** o TJSP a condenou em 11/05/2023 a R$ 500 mil de dano moral coletivo, numa ação civil pública ([Consumidor Moderno](https://consumidormoderno.com.br/justica-multa-viaquatro-em-r-500-mil-por-biometria-facial-sem-consentimento/)). A empresa alegou processamento anônimo, sem armazenamento e com descarte imediato, quase a arquitetura deste app. Foi condenada mesmo assim, porque extraía atributos e emoções do rosto para publicidade, sem consentimento. O caso começou antes da vigência da LGPD e foi julgado sobretudo pelo CDC e pelo direito de imagem. **Conclusão para o produto: processar na borda não basta; não se pode inferir nada do rosto.**
  - **Hering:** multada pela Senacon em R$ 58.767 ([Idec](https://idec.org.br/noticia/apos-denuncia-do-idec-hering-e-condenada-por-uso-de-reconhecimento-facial)).
- **RaiaDrogasil:** em fev/2025, a ANPD determinou que a empresa ofereça alternativa à biometria na identificação do programa Univers e abriu processo sancionador sobre o uso de dados sensíveis na RD Ads ([Convergência Digital](https://convergenciadigital.com.br/governo/anpd-manda-raiadrogasil-ter-uma-alternativa-ao-reconhecimento-facial/)). Não é um caso de videoanálise.
- **Papéis:** a loja é a controladora e a Agrada é a operadora, com responsabilidade solidária se descumprir a lei (art. 42).
- **Pequeno porte:** a Resolução CD/ANPD nº 2/2022 simplifica obrigações para agentes de pequeno porte, o que interessa a clientes como o Polvo. **Não conferi os detalhes.**
- **Requisitos do produto:**
  - nenhum vídeo sai da loja;
  - **face, idade, gênero e emoção fora do código**, não apenas desligados (desligar os metadados de face da VIP 7550);
  - placa de aviso na loja;
  - DPA e contrato definindo de quem são os dados agregados e o uso do nome e do case;
  - modelos de RIPD e de teste de legítimo interesse entregues ao cliente;
  - nenhuma métrica individual de funcionário;
  - nada em provador ou vestiário.

## Piloto no Atacado Polvo

**O que se sabe** ([site](https://www.atacadopolvo.com.br/)):
- ativo desde 2020, com mais de mil itens;
- lojas na Av. Dr. Carlos Barbosa, 931 e na Av. Bento Gonçalves, 5928;
- horário: seg–sex 8h–18h, sáb 9h–15h;
- pedido mínimo de R$ 300 ligado ao frete/carrinho online (**não se sabe se vale no balcão**);
- "Clube de Ofertas": grupo de WhatsApp com promoções relâmpago, em que os membros podem retirar na loja.

**O que não se sabe:**
- área da loja;
- se é autosserviço ou balcão;
- número de caixas;
- câmeras e PDV/ERP.

**Confirmar com o usuário que o cliente é este CNPJ.** Hipótese: dezenas a poucas centenas de pessoas por dia.

**Go/no-go na visita técnica:**
- **Se houver autosserviço com 3 ou mais zonas expositivas e o PDV tiver cupom por SKU, hora, custo e canal:** piloto de **margem por zona**.
- **Se for balcão:** piloto de **fluxo, espera e conversão**. Nesse caso, assumir que o piloto **não valida** o produto central.

**Escopo:**
- loja principal: 2–4 câmeras (mais 1 na entrada, se faltar), linha de entrada, balcão/caixa, retirada e 3–6 zonas;
- **2ª unidade como controle**, com só a contagem de entrada e o PDV, para uma diferença-em-diferenças.

**Duração:** 8–10 semanas.
- 3–4 semanas de linha de base;
- intervenção (layout, ofertas ou escala de equipe), de preferência em rodízio ABBA;
- 3–4 semanas de medição.

**Confusores do período (nov–jan):** fim de ano, 13º, recesso de condomínios e restaurantes e início de mês. Fixar antes o efeito mínimo detectável (por exemplo, só diferenças de 25% ou mais). **O resultado será indicativo, não uma prova.**

**Critérios de sucesso, fixados antes de começar:**
1. Erro de contagem na entrada de no máximo 10%, contra contagem manual, em pelo menos 6 janelas de 1 h (pico e vale).
2. MAPE de no máximo 15% por zona e diferença de viés entre zonas de no máximo 10 p.p., em pelo menos 6 janelas zona×hora por zona. O Spearman fica só como métrica descritiva.
3. Uptime de 95% ou mais.
4. **MB por visitante calculada para pelo menos 4 zonas, só com vendas presenciais de autosserviço, e pelo menos 95% da MB presencial do PDV reconciliada com zonas mapeadas.**
5. Pelo menos 1 decisão tomada com os dados, com impacto medido contra o controle.
6. Aceite formal para virar case e intenção de pagamento declarada.

**Entregáveis:** painel, relatório semanal, relatório final e case de 1–2 páginas.

**Formato** (estimativa): gratuito ou simbólico (hardware a preço de custo) em troca do case, ou R$ 1.500–3.000 abatidos da adesão.

**Perguntas a fazer ao cliente antes:**
- A loja é autosserviço ou balcão? Qual a área, quantos caixas e quantas pessoas entram por dia?
- Qual a fatia PF/PJ no balcão? O mínimo de R$ 300 vale lá?
- Que % da receita passa pela loja física? O PDV marca o canal (balcão, retirada do clube, WhatsApp, entrega)?
- Qual o NVR, quantas câmeras, em que ângulo, há RTSP? Quem é o instalador? Como é a rede?
- O PDV/ERP exporta cupom por SKU com hora e custo? Os SKUs são os mesmos da Tray?
- Há verbas/rebates de fornecedor? Qual o aluguel/m²? Há registro de quebras?
- Os funcionários usam uniforme? Em que horário é a reposição?
- Quem responde pela LGPD na empresa?

**Recomendação:** buscar em paralelo um segundo piloto em autosserviço de verdade, como um mercado ou atacarejo regional.

## Roadmap MVP → v1

**Quem constrói:** a Agrada precisa de alguém com experiência em visão computacional/edge e de um parceiro de campo (instalador de CFTV), por contratação ou parceria.

**Alternativa de menor risco:** no piloto, usar a contagem embarcada das câmeras Intelbras IA / Defense IA, que exportam planilha, e construir só o cruzamento com PDV/Tray e o painel.

Todos os esforços são **estimativas**.

| Fase | Conteúdo | Esforço |
|---|---|---|
| 0. Levantamento | Visita, go/no-go, teste de RTSP e rede, DPA, placas | 1 semana, 6–12 h |
| 0b. Dados | Mapa SKU→zona **por categoria** (mais de 1.000 SKUs) e extração/integração do PDV | 8–20 h com o cliente + 20–40 h de integração |
| 1. MVP de 1 loja | Agente de borda, linhas e zonas, SQLite, validação manual, ajuste fino se necessário, importador de CSV, painel em Metabase ou Streamlit | 75–165 h, 6–10 semanas |
| 2. MVP de produto | Editor de zonas, saúde das câmeras, multi-loja, alertas | 8–12 semanas, 2–3 pessoas |
| 3. v1 comercial | Multi-cliente, atualização de frota, conectores de ERP e Tray, contribuição por zona, relatórios via LLM, cobrança, integradores | +3–4 meses, 3–5 pessoas |
| Operação | Recalibrar zonas, manter o planograma versionado | 8–20 h/mês no piloto; meta de ≤2 h/loja/mês |

Esboço do núcleo (não executado; APIs conferidas em out/2026):

```python
import supervision as sv
from rfdetr import RFDETRNano                 # Apache-2.0
from rfdetr.util.coco_classes import COCO_CLASSES  # conferir caminho na versao instalada
from trackers import ByteTrackTracker         # sv.ByteTrack saiu na 0.31.0

model = RFDETRNano()
tracker = ByteTrackTracker(frame_rate=6, lost_track_buffer=60,
                           track_activation_threshold=0.45)  # padrao 0.7 subconta
linha = sv.LineZone(start=p1, end=p2)         # boca da zona: T_c por cruzamento
det = model.predict(frame, threshold=0.4)
det = det[[COCO_CLASSES[c] == "person" for c in det.class_id]]  # filtra pelo nome
det = tracker.update(det)
entrou, saiu = linha.trigger(det)             # soma em RAM; agrega a cada 15 min
```

`lost_track_buffer` é escalado por frame_rate/30: com o valor padrão de 30 e 6 fps, o track some em cerca de 1 s. No RF-DETR, o mapeamento do id da classe varia entre a documentação e o código, por isso o filtro é pelo nome.

## Insights que o produto deve gerar

São hipóteses a validar.

**Piloto Polvo:**
1. **Espera no balcão/caixa por hora e desistências**, cruzadas com a escala de equipe.
2. **Picos PJ (manhã, dias úteis) e PF (sábado)**, separados por CNPJ/CPF na nota, porque a câmera não distingue.
3. **Compra extra na retirada:** que % dos membros do Clube de Ofertas que vêm retirar gera um cupom adicional (linha da zona de retirada × cupom).
4. **Ofertas do WhatsApp na loja:** visitas à área de ofertas comparadas com a venda dos itens anunciados no mesmo dia.
5. **Conversão visitante → cupom e ticket em R$ e em fardos**, não só em número de cupons.

**Atacarejo (2º cliente, com milhares de cupons por mês):**

6. **Quantos caixas abrir por hora**, a partir da fila e da escala de operadores.
7. **Ruptura em zona de alto tráfego**, usando o saldo do ERP (≤ 0 ou abaixo do mínimo de exposição), não "venda zerada". Perda **estimada** = tráfego da zona × conversão histórica do SKU × margem. A "ruptura fantasma" (há estoque, mas não na gôndola) é hipótese a medir. A Neogrid mede cerca de 11,2% de frequência de ruptura em supermercados em 2025 ([O Povo](https://www.opovo.com.br/noticias/economia/2026/01/12/christiane-cruz-da-neogrid-supermercados-tem-rs-6-bilhoes-imobilizados-em-itens-de-baixo-giro.html)). Não serve de referência para o Polvo.
8. **Audiência de pontas e ilhas para retail media:** o Assaí já faz isso ([Mercado & Consumo](https://mercadoeconsumo.com.br/10/05/2024/retail-media/com-audiencia-de-35-milhoes-de-visitantes-assai-lanca-estrategia-de-retail-media/)), e as redes regionais podem vender exposição à indústria.
9. **Corredores frios e tráfego alto que não vira margem:** reposicionar categorias destino e de impulso, decidindo sempre pela MB/contribuição por visitante.

**Vestuário (Roupas Térmicas):**

10. O provador é a zona-chave. Um vendedor extra no provador no pico deu +12,55% de transações num estudo ([UNC](https://www.kenan-flagler.unc.edu/research/the-cost-of-self-service/)). "Parada sem venda" pode ser falta de tamanho, então vale registrar no PDV a venda perdida por tamanho. As frentes frias funcionam como gatilho de escala e reposição.

## Armadilhas

- **Viés de localização:** Sorensen atribui 85% do comportamento à localização ([Quirk's](https://www.quirks.com/articles/trade-talk-stranded-in-the-soup-aisle)). Dizer que um corredor "é lucrativo" exige experimento (ABBA ou controle), não um mapa de calor.
- **Oclusão:** carrinhos-plataforma, paletes e paleteiras escondem pessoas. Preferir câmera alta ou zenital e marcar os horários de reposição.
- **Funcionários, repositores e promotores:**
  - mascarar as áreas de caixa e de estoque;
  - descartar permanências acima de 10–15 min (estimativa);
  - usar regra de uniforme;
  - ignorar o período fora do horário de funcionamento.
- **Contagem dupla:** reentradas e troca de ID. A métrica é "visitas", não "pessoas únicas". Grupos inflam as entradas em relação aos cupons.
- **Atribuição:** um SKU exposto em dois pontos precisa de regra de rateio. Venda entregue, por WhatsApp, online ou retirada fica **fora do numerador** (MB_c). No Polvo isso é crítico.
- **Margem não é lucro:** sem verbas, quebras e custo de ocupação, o ranking pode estar invertido.
- **Sazonalidade e volume baixo:** só diferenças grandes aparecem. Comparar semanas equivalentes e usar a 2ª unidade como controle. Na Roupas Térmicas, o inverno domina tudo.
- **Precisão:** não vender "97%". Validar zona a zona e publicar o erro medido, porque o viés depende da geometria da zona.
- **Permanência alta é ambígua:** pode ser interesse, confusão ou falta de produto. Só faz sentido lida junto com as vendas.

## Fontes principais

- Atacado da Limpeza Polvo: https://www.atacadopolvo.com.br/
- Licença Ultralytics: https://www.ultralytics.com/license
- RF-DETR, licenças: https://blog.roboflow.com/rf-detr-is-free-to-use-commercially/ e https://github.com/roboflow/rf-detr
- Supervision, changelog: https://supervision.roboflow.com/latest/changelog/
- Trackers, ByteTrack (parâmetros padrão): https://raw.githubusercontent.com/roboflow/trackers/main/trackers/core/bytetrack/tracker.py
- Intelbras VIP 7550 Z IA FT: https://backend.intelbras.com/sites/default/files/2026-05/Datasheet%207550%20BD%20Z%20IA%20%20FT%20-%20V018_0.pdf
- Cruz et al. 2020: https://animorepository.dlsu.edu.ph/faculty_research/14064
- Caso ViaQuatro: https://consumidormoderno.com.br/justica-multa-viaquatro-em-r-500-mil-por-biometria-facial-sem-consentimento/
- Caso Hering: https://idec.org.br/noticia/apos-denuncia-do-idec-hering-e-condenada-por-uso-de-reconhecimento-facial
- ANPD e RaiaDrogasil: https://convergenciadigital.com.br/governo/anpd-manda-raiadrogasil-ter-uma-alternativa-ao-reconhecimento-facial/
- Preços Dor: https://www.getdor.com/compare/best-people-counters