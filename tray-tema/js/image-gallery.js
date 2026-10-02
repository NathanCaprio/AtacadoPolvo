"use strict";var ThemeModule=(()=>{function m(i){return document.querySelector(i)}function b(i){return document.querySelectorAll(i)}var L=()=>{if(!m(".section-image-gallery"))return;let c=b(".section-image-gallery .image-gallery-item");if(c.length===0)return;let y=Array.from(c).map(e=>({src:e.getAttribute("data-gallery-src")||"",title:e.getAttribute("data-gallery-title")||"",buttonText:e.getAttribute("data-button-text")||"",buttonLink:e.getAttribute("data-button-link")||"",openNewTab:e.getAttribute("data-new-tab")==="true"})),u=y.length,o=0,t=null,g=!1,E=()=>{let e=document.createElement("div");return e.className="gallery-lightbox",e.innerHTML=`
      <div class="gallery-lightbox__header">
        <span class="gallery-lightbox__counter"></span>
        <button class="gallery-lightbox__close" aria-label="Fechar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="gallery-lightbox__body">
        <img class="gallery-lightbox__image" src="" alt="">
      </div>
      <button class="gallery-lightbox__nav gallery-lightbox__nav--prev" aria-label="Anterior">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button class="gallery-lightbox__nav gallery-lightbox__nav--next" aria-label="Pr\xF3ximo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      <div class="gallery-lightbox__caption">
        <h3 class="gallery-lightbox__title"></h3>
        <a class="gallery-lightbox__button" href=""></a>
      </div>
    `,document.body.appendChild(e),e},h=()=>{if(!t)return;let e=y[o],r=t.querySelector(".gallery-lightbox__counter"),l=t.querySelector(".gallery-lightbox__title"),s=t.querySelector(".gallery-lightbox__image"),n=t.querySelector(".gallery-lightbox__button"),a=t.querySelector(".gallery-lightbox__caption");r.textContent=`${o+1}/${u}`,e.title?(l.textContent=e.title,l.style.display=""):l.style.display="none",s.src=e.src,s.alt=e.title||"",e.buttonText&&e.buttonLink?(n.textContent=e.buttonText,n.href=e.buttonLink,n.style.display="",e.openNewTab?(n.target="_blank",n.rel="noopener noreferrer"):(n.removeAttribute("target"),n.removeAttribute("rel"))):n.style.display="none";let T=e.title||e.buttonText&&e.buttonLink;a.style.display=T?"":"none"},x=()=>{if(!t)return;let e=t.querySelector(".gallery-lightbox__nav--prev"),r=t.querySelector(".gallery-lightbox__nav--next");e&&(e.style.visibility=o<=0?"hidden":"visible"),r&&(r.style.visibility=o>=u-1?"hidden":"visible")},p=e=>{e<0||e>=u||(o=e,h(),x())},v=()=>p(o+1),f=()=>p(o-1),_=e=>{t||(t=E(),w()),o=e,h(),x(),t.classList.add("is-active"),document.body.style.overflow="hidden",g=!0},d=()=>{t&&(t.classList.remove("is-active"),document.body.style.overflow="",g=!1)},w=()=>{if(!t)return;t.querySelector(".gallery-lightbox__close")?.addEventListener("click",d);let r=t.querySelector(".gallery-lightbox__nav--prev"),l=t.querySelector(".gallery-lightbox__nav--next");r?.addEventListener("click",f),l?.addEventListener("click",v);let s=t.querySelector(".gallery-lightbox__body");t.addEventListener("click",n=>{let a=n.target;(a===t||a===s)&&d()})};document.addEventListener("keydown",e=>{if(g)switch(e.key){case"ArrowLeft":e.preventDefault(),f();break;case"ArrowRight":e.preventDefault(),v();break;case"Escape":e.preventDefault(),d();break}}),c.forEach((e,r)=>{e.addEventListener("click",()=>{_(r)})})};L();})();
