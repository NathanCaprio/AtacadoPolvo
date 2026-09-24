/* =========================================================================
   ATACADO POLVO - Catalogo (mock)
   -------------------------------------------------------------------------
   Enquanto nao existe backend, o catalogo vive neste arquivo. Quando a API
   entrar, basta trocar a leitura de window.CATALOGO por um fetch:

       const res  = await fetch('/api/produtos');
       const data = await res.json();

   O formato de cada produto ja segue o que a API deveria devolver.
   (Nao usamos fetch de um .json local porque o navegador bloqueia
   requisicoes file:// por CORS — assim o site abre com duplo clique.)
   ========================================================================= */

window.CATALOGO = {

  categorias: [
    { id: 'cozinha',      nome: 'Cozinha e Louças',        cor: '#7B2FE3', icone: 'dish',    desc: 'Detergentes, desengordurantes e lava-louças para uso intenso.' },
    { id: 'lavanderia',   nome: 'Roupas e Lavanderia',     cor: '#5B21B6', icone: 'shirt',   desc: 'Sabão em pó e líquido, amaciantes, alvejantes e tira-manchas.' },
    { id: 'superficies',  nome: 'Pisos e Superfícies',     cor: '#C026D3', icone: 'floor',   desc: 'Multiuso, ceras, lustra-móveis e limpadores perfumados.' },
    { id: 'banheiro',     nome: 'Banheiro e Desinfecção',  cor: '#8B5CF6', icone: 'drop',    desc: 'Desinfetantes, água sanitária e removedores de tártaro.' },
    { id: 'descartaveis', nome: 'Descartáveis e Papéis',   cor: '#A16207', icone: 'roll',    desc: 'Papel higiênico, toalha, guardanapo, copos e sacos de lixo.' },
    { id: 'utensilios',   nome: 'Utensílios e Acessórios', cor: '#DB2777', icone: 'broom',   desc: 'Vassouras, rodos, baldes, panos, esponjas e luvas.' },
    { id: 'higiene',      nome: 'Higiene Pessoal',         cor: '#6D28D9', icone: 'soap',    desc: 'Sabonetes, álcool em gel e higienizantes para ambientes.' },
    { id: 'profissional', nome: 'Linha Profissional',      cor: '#3B1A6B', icone: 'gallon',  desc: 'Concentrados e galões de 5L e 20L para uso institucional.' }
  ],

  produtos: [
    // --- Cozinha ---------------------------------------------------------
    { id:'c01', nome:'Detergente Neutro 500ml',            cat:'cozinha', art:'bottle',  desc:'Alto rendimento, testado dermatologicamente.',        emb:'Frasco 500ml',  caixa:'Caixa com 24 un.', tag:'mais-vendido' },
    { id:'c02', nome:'Detergente Clear Limão 500ml',       cat:'cozinha', art:'bottle',  desc:'Fórmula concentrada com fragrância cítrica.',         emb:'Frasco 500ml',  caixa:'Caixa com 24 un.' },
    { id:'c03', nome:'Desengordurante Spray 500ml',        cat:'cozinha', art:'spray',   desc:'Remove gordura pesada de coifas e fogões.',           emb:'Spray 500ml',   caixa:'Caixa com 12 un.', tag:'mais-vendido' },
    { id:'c04', nome:'Lava-Louças Automático 500ml',       cat:'cozinha', art:'bottle',  desc:'Indicado para lava-louças residencial e comercial.',  emb:'Frasco 500ml',  caixa:'Caixa com 12 un.' },
    { id:'c05', nome:'Limpa Inox Spray 300ml',             cat:'cozinha', art:'spray',   desc:'Brilho imediato sem manchar aço escovado.',           emb:'Spray 300ml',   caixa:'Caixa com 12 un.' },

    // --- Lavanderia ------------------------------------------------------
    { id:'l01', nome:'Sabão em Pó Multiação 1kg',          cat:'lavanderia', art:'box',    desc:'Remove manchas difíceis em água fria ou quente.',   emb:'Caixa 1kg',     caixa:'Fardo com 12 un.', tag:'mais-vendido' },
    { id:'l02', nome:'Sabão Líquido Concentrado 3L',       cat:'lavanderia', art:'gallon', desc:'Rende até 60 lavagens por galão.',                  emb:'Galão 3L',      caixa:'Caixa com 4 un.' },
    { id:'l03', nome:'Amaciante Concentrado 2L',           cat:'lavanderia', art:'gallon', desc:'Perfume prolongado e maciez por até 7 dias.',       emb:'Galão 2L',      caixa:'Caixa com 6 un.' },
    { id:'l04', nome:'Alvejante sem Cloro 1L',             cat:'lavanderia', art:'bottle', desc:'Seguro para roupas coloridas e tecidos delicados.', emb:'Frasco 1L',     caixa:'Caixa com 12 un.' },
    { id:'l05', nome:'Tira-Manchas em Pó 450g',            cat:'lavanderia', art:'box',    desc:'Ação enzimática em manchas orgânicas.',             emb:'Pote 450g',     caixa:'Caixa com 12 un.', tag:'novo' },
    { id:'l06', nome:'Sabão de Coco em Barra 200g',        cat:'lavanderia', art:'bar',    desc:'Barra tradicional, ideal para pré-lavagem.',        emb:'Barra 200g',    caixa:'Fardo com 50 un.' },

    // --- Superficies -----------------------------------------------------
    { id:'s01', nome:'Limpador Multiuso 500ml',            cat:'superficies', art:'spray',  desc:'Limpa vidros, azulejos, fórmica e plásticos.',     emb:'Spray 500ml',   caixa:'Caixa com 12 un.', tag:'mais-vendido' },
    { id:'s02', nome:'Limpador Perfumado Lavanda 2L',      cat:'superficies', art:'gallon', desc:'Perfume residual de longa duração para pisos.',    emb:'Galão 2L',      caixa:'Caixa com 6 un.' },
    { id:'s03', nome:'Cera Líquida Incolor 750ml',         cat:'superficies', art:'bottle', desc:'Brilho e proteção para pisos frios e vinílicos.',  emb:'Frasco 750ml',  caixa:'Caixa com 12 un.' },
    { id:'s04', nome:'Lustra-Móveis 200ml',                cat:'superficies', art:'spray',  desc:'Protege madeira e laqueados do ressecamento.',     emb:'Frasco 200ml',  caixa:'Caixa com 12 un.' },
    { id:'s05', nome:'Limpa Vidros Spray 500ml',           cat:'superficies', art:'spray',  desc:'Seca rápido e não deixa marcas.',                  emb:'Spray 500ml',   caixa:'Caixa com 12 un.' },

    // --- Banheiro --------------------------------------------------------
    { id:'b01', nome:'Desinfetante Pinho 2L',              cat:'banheiro', art:'gallon', desc:'Elimina 99,9% das bactérias com ação prolongada.',    emb:'Galão 2L',      caixa:'Caixa com 6 un.', tag:'mais-vendido' },
    { id:'b02', nome:'Água Sanitária 1L',                  cat:'banheiro', art:'bottle', desc:'Cloro ativo estabilizado, registro na Anvisa.',       emb:'Frasco 1L',     caixa:'Caixa com 12 un.' },
    { id:'b03', nome:'Removedor de Tártaro 500ml',         cat:'banheiro', art:'bottle', desc:'Bico angular para limpeza sob a borda do vaso.',      emb:'Frasco 500ml',  caixa:'Caixa com 12 un.' },
    { id:'b04', nome:'Desodorizador Sanitário Pedra',      cat:'banheiro', art:'bar',    desc:'Perfume contínuo por até 30 dias.',                   emb:'Unidade 35g',   caixa:'Caixa com 24 un.' },
    { id:'b05', nome:'Limpa Azulejo Concentrado 1L',       cat:'banheiro', art:'bottle', desc:'Dissolve gordura e encardido de rejuntes.',           emb:'Frasco 1L',     caixa:'Caixa com 12 un.' },

    // --- Descartaveis ----------------------------------------------------
    { id:'d01', nome:'Papel Higiênico Folha Dupla 30m',    cat:'descartaveis', art:'roll', desc:'Fardo com 64 rolos, folha dupla 100% celulose.',   emb:'Rolo 30m',      caixa:'Fardo com 64 un.', tag:'mais-vendido' },
    { id:'d02', nome:'Papel Toalha Interfolha 1000 fls',   cat:'descartaveis', art:'roll', desc:'Padrão institucional para dispensers.',            emb:'Pacote 1000 fls', caixa:'Caixa com 5 pct.' },
    { id:'d03', nome:'Guardanapo 24x22cm',                 cat:'descartaveis', art:'roll', desc:'Pacote com 50 folhas, alta absorção.',             emb:'Pacote 50 fls', caixa:'Fardo com 40 pct.' },
    { id:'d04', nome:'Saco de Lixo 100L Reforçado',        cat:'descartaveis', art:'bag',  desc:'Alta resistência, conforme ABNT NBR 9191.',        emb:'Pacote 100 un.', caixa:'Fardo com 5 pct.' },
    { id:'d05', nome:'Saco de Lixo 30L',                   cat:'descartaveis', art:'bag',  desc:'Uso doméstico e escritório.',                      emb:'Pacote 100 un.', caixa:'Fardo com 10 pct.' },
    { id:'d06', nome:'Copo Descartável 200ml',             cat:'descartaveis', art:'cup',  desc:'Certificado INMETRO, atóxico.',                    emb:'Pacote 100 un.', caixa:'Caixa com 25 pct.' },

    // --- Utensilios ------------------------------------------------------
    { id:'u01', nome:'Esponja Dupla Face',                 cat:'utensilios', art:'sponge', desc:'Fibra antibacteriana de alta durabilidade.',       emb:'Pacote 4 un.',  caixa:'Caixa com 60 pct.', tag:'mais-vendido' },
    { id:'u02', nome:'Vassoura Nylon com Cabo',            cat:'utensilios', art:'broom',  desc:'Cerdas macias com cabo de 1,20m.',                 emb:'Unidade',       caixa:'Fardo com 12 un.' },
    { id:'u03', nome:'Rodo de Borracha 40cm',              cat:'utensilios', art:'broom',  desc:'Borracha dupla e base reforçada.',                 emb:'Unidade',       caixa:'Fardo com 12 un.' },
    { id:'u04', nome:'Balde Plástico 12L',                 cat:'utensilios', art:'bucket', desc:'Polipropileno virgem com alça metálica.',          emb:'Unidade',       caixa:'Fardo com 10 un.' },
    { id:'u05', nome:'Pano de Chão Alvejado',              cat:'utensilios', art:'cloth',  desc:'Algodão 100%, 60x80cm.',                           emb:'Unidade',       caixa:'Fardo com 20 un.' },
    { id:'u06', nome:'Luva de Látex Multiuso',             cat:'utensilios', art:'glove',  desc:'Forro interno, tamanhos P, M e G.',                emb:'Par',           caixa:'Caixa com 24 pares' },

    // --- Higiene ---------------------------------------------------------
    { id:'h01', nome:'Álcool em Gel 70% 500ml',            cat:'higiene', art:'bottle', desc:'Com válvula pump, registro na Anvisa.',               emb:'Frasco 500ml',  caixa:'Caixa com 12 un.', tag:'mais-vendido' },
    { id:'h02', nome:'Sabonete Líquido Erva-Doce 5L',      cat:'higiene', art:'gallon', desc:'Refil econômico para dispensers.',                    emb:'Galão 5L',      caixa:'Caixa com 4 un.' },
    { id:'h03', nome:'Sabonete em Barra 90g',              cat:'higiene', art:'bar',    desc:'Glicerinado, fragrâncias sortidas.',                  emb:'Barra 90g',     caixa:'Caixa com 48 un.' },
    { id:'h04', nome:'Álcool Líquido 70% 1L',              cat:'higiene', art:'bottle', desc:'Antisséptico para superfícies.',                      emb:'Frasco 1L',     caixa:'Caixa com 12 un.' },

    // --- Profissional ----------------------------------------------------
    { id:'p01', nome:'Detergente Profissional 5L',         cat:'profissional', art:'gallon', desc:'Rendimento industrial para cozinhas comerciais.', emb:'Galão 5L',    caixa:'Caixa com 4 un.' },
    { id:'p02', nome:'Desinfetante Concentrado 5L',        cat:'profissional', art:'gallon', desc:'Diluição 1:100, laudo microbiológico.',           emb:'Galão 5L',    caixa:'Caixa com 4 un.', tag:'novo' },
    { id:'p03', nome:'Limpador Multiuso 20L',              cat:'profissional', art:'drum',   desc:'Bombona para condomínios e indústrias.',          emb:'Bombona 20L', caixa:'Unidade' },
    { id:'p04', nome:'Cera Acrílica Profissional 5L',      cat:'profissional', art:'gallon', desc:'Alto brilho para enceradeiras industriais.',      emb:'Galão 5L',    caixa:'Caixa com 4 un.' },
    { id:'p05', nome:'Desengordurante Industrial 20L',     cat:'profissional', art:'drum',   desc:'Uso em cozinhas industriais e frigoríficos.',     emb:'Bombona 20L', caixa:'Unidade' }
  ]
};

/* -------------------------------------------------------------------------
   Arte dos produtos
   Sem fotografia ainda: cada produto ganha uma ilustracao SVG gerada a
   partir do tipo de embalagem (art) e da cor da categoria.
   Para trocar por foto real, substitua a chamada de artProduto() em
   catalogo.js por uma tag <img>.
   ------------------------------------------------------------------------- */
window.artProduto = function (tipo, cor) {
  const c = cor || '#7B2FE3';
  const shapes = {
    bottle: `<path d="M38 22h24v10l8 12v50a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V44l8-12z" fill="${c}"/>
             <rect x="36" y="10" width="28" height="14" rx="4" fill="${c}" opacity=".62"/>
             <rect x="36" y="56" width="28" height="24" rx="3" fill="#fff" opacity=".9"/>`,
    spray:  `<path d="M40 30h22a6 6 0 0 1 6 6v54a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V36a6 6 0 0 1 6-6z" fill="${c}"/>
             <path d="M44 14h14v16H44z" fill="${c}" opacity=".62"/>
             <path d="M58 16h14v7H58z" fill="${c}" opacity=".45"/>
             <rect x="39" y="52" width="24" height="22" rx="3" fill="#fff" opacity=".9"/>`,
    gallon: `<path d="M26 34h48a6 6 0 0 1 6 6v50a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6z" fill="${c}"/>
             <rect x="42" y="16" width="18" height="18" rx="4" fill="${c}" opacity=".62"/>
             <path d="M62 22h16a6 6 0 0 1 0 12h-4" fill="none" stroke="${c}" stroke-width="7" opacity=".45"/>
             <rect x="28" y="52" width="44" height="30" rx="3" fill="#fff" opacity=".9"/>`,
    drum:   `<rect x="22" y="22" width="56" height="76" rx="9" fill="${c}"/>
             <rect x="30" y="14" width="40" height="10" rx="4" fill="${c}" opacity=".62"/>
             <rect x="22" y="40" width="56" height="7" fill="#fff" opacity=".35"/>
             <rect x="22" y="76" width="56" height="7" fill="#fff" opacity=".35"/>
             <rect x="30" y="52" width="40" height="20" rx="3" fill="#fff" opacity=".9"/>`,
    box:    `<path d="M20 36l30-14 30 14v50l-30 14-30-14z" fill="${c}"/>
             <path d="M20 36l30 14 30-14" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>
             <path d="M50 50v50" stroke="#fff" stroke-width="3" opacity=".5"/>
             <rect x="32" y="58" width="36" height="22" rx="3" fill="#fff" opacity=".85"/>`,
    bar:    `<rect x="18" y="38" width="64" height="40" rx="12" fill="${c}"/>
             <rect x="28" y="48" width="44" height="20" rx="6" fill="#fff" opacity=".85"/>
             <circle cx="74" cy="32" r="5" fill="${c}" opacity=".45"/>
             <circle cx="86" cy="44" r="3.5" fill="${c}" opacity=".35"/>`,
    roll:   `<rect x="26" y="26" width="48" height="60" rx="10" fill="${c}"/>
             <ellipse cx="50" cy="26" rx="24" ry="9" fill="${c}" opacity=".62"/>
             <ellipse cx="50" cy="26" rx="9" ry="4" fill="#fff" opacity=".9"/>
             <path d="M74 60h14v26H74z" fill="#fff" opacity=".85"/>`,
    bag:    `<path d="M28 30h44l6 62a8 8 0 0 1-8 9H30a8 8 0 0 1-8-9z" fill="${c}"/>
             <path d="M38 30V20a12 12 0 0 1 24 0v10" fill="none" stroke="${c}" stroke-width="6" opacity=".55"/>
             <rect x="34" y="56" width="32" height="22" rx="3" fill="#fff" opacity=".85"/>`,
    cup:    `<path d="M30 28h40l-6 64a8 8 0 0 1-8 7H44a8 8 0 0 1-8-7z" fill="${c}"/>
             <ellipse cx="50" cy="28" rx="20" ry="7" fill="${c}" opacity=".55"/>
             <path d="M34 56h32l-2 16H36z" fill="#fff" opacity=".8"/>`,
    sponge: `<rect x="16" y="36" width="68" height="34" rx="8" fill="${c}"/>
             <rect x="16" y="36" width="68" height="13" rx="8" fill="#fff" opacity=".45"/>
             <circle cx="34" cy="60" r="3" fill="#fff" opacity=".6"/>
             <circle cx="50" cy="63" r="2.4" fill="#fff" opacity=".6"/>
             <circle cx="65" cy="58" r="3" fill="#fff" opacity=".6"/>`,
    broom:  `<rect x="45" y="10" width="10" height="54" rx="5" fill="${c}" opacity=".55"/>
             <path d="M28 64h44l6 30H22z" fill="${c}"/>
             <path d="M32 74v20M42 74v20M52 74v20M62 74v20" stroke="#fff" stroke-width="3" opacity=".5"/>`,
    bucket: `<path d="M22 34h56l-7 58a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7z" fill="${c}"/>
             <ellipse cx="50" cy="34" rx="28" ry="9" fill="${c}" opacity=".55"/>
             <path d="M24 30a26 20 0 0 1 52 0" fill="none" stroke="${c}" stroke-width="4" opacity=".6"/>
             <rect x="36" y="56" width="28" height="20" rx="3" fill="#fff" opacity=".85"/>`,
    cloth:  `<path d="M20 30c14 8 46 8 60 0v56c-14 8-46 8-60 0z" fill="${c}"/>
             <path d="M20 48c14 8 46 8 60 0M20 66c14 8 46 8 60 0" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>`,
    glove:  `<path d="M34 46V26a6 6 0 0 1 12 0v16h4V20a6 6 0 0 1 12 0v22h4V28a6 6 0 0 1 12 0v40c0 18-10 28-24 28S34 86 34 68z" fill="${c}"/>
             <path d="M34 78h44" stroke="#fff" stroke-width="4" opacity=".5"/>`
  };
  return `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${shapes[tipo] || shapes.bottle}
  </svg>`;
};
