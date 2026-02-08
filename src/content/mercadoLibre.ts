import { PortMessage, Product } from '../types';

console.log('ML Scraper: Cargado 📦');

let puerto: chrome.runtime.Port | null = null;
let objetivo = 100;
let productosAcumulados: Product[] = [];

// 1. RECUPERAR MEMORIA AL INICIO
const trabajoPendiente = sessionStorage.getItem('krowdy_ml_progress');
if (trabajoPendiente) {
  try {
    const estado = JSON.parse(trabajoPendiente);
    // Solo restauramos si es la misma búsqueda
    if (estado.keyword && estado.productos && estado.productos.length > 0) {
        console.log(`[ML] Restaurando ${estado.productos.length} productos previos...`);
        // Nos reconectamos proactivamente
        conectarYContinuar(estado.keyword, estado.productos);
    }
  } catch (e) {
    console.error("Error leyendo memoria", e);
    sessionStorage.removeItem('krowdy_ml_progress');
  }
}

// 2. ESCUCHAR CONEXIÓN DEL BACKGROUND
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'krowdy_scraping') return;
  puerto = port;
  configurarPuerto();
});

function conectarYContinuar(keyword: string, productosPrevios: Product[]) {
  puerto = chrome.runtime.connect({ name: 'krowdy_scraping' });
  configurarPuerto();
  productosAcumulados = productosPrevios;
  // Damos un pequeño respiro para asegurar que la página cargó el DOM
  setTimeout(() => continuarScraping(keyword), 1000);
}

function configurarPuerto() {
  if (!puerto) return;
  puerto.onMessage.addListener((msg: PortMessage) => {
    if (msg.type === 'START') {
      console.log('[ML] Nueva búsqueda:', msg.keyword);
      sessionStorage.removeItem('krowdy_ml_progress'); // Borrón y cuenta nueva
      productosAcumulados = [];
      continuarScraping(msg.keyword);
    }
  });
}

function extraerPaginaActual(keyword: string): Product[] {
  // Selectores variados porque ML cambia a veces
  const items = document.querySelectorAll('.ui-search-layout__item, li.ui-search-result');
  if (!items.length) return [];

  return Array.from(items).map((item, index) => {
    const el = item as HTMLElement;
    const title = el.querySelector('.ui-search-item__title, .poly-component__title')?.textContent?.trim() || 'Sin título';
    const priceText = el.querySelector('.andes-money-amount__fraction, .poly-price__current .andes-money-amount__fraction')?.textContent?.trim() || '0';
    const link = el.querySelector('a.ui-search-link, a.poly-component__title')?.getAttribute('href') || '';
    const priceNumeric = parseFloat(priceText.replace(/\./g, ''));

    return {
      site: 'mercadolibre',
      keyword: keyword,
      timestamp: new Date().toISOString(),
      position: productosAcumulados.length + index + 1,
      title: title,
      priceVisible: `S/ ${priceText}`,
      priceNumeric: isNaN(priceNumeric) ? 0 : priceNumeric,
      url: link
    };
  });
}

function continuarScraping(keyword: string) {
  if (!puerto) return;

  // 1. Extraer
  const nuevos = extraerPaginaActual(keyword);
  // Filtrar duplicados por URL para asegurar conteo real
  const unicos = nuevos.filter(n => !productosAcumulados.some(p => p.url === n.url));
  productosAcumulados = [...productosAcumulados, ...unicos];

  console.log(`[ML] Total acumulado: ${productosAcumulados.length}`);

  // 2. Reportar
  puerto.postMessage({ 
    type: 'PROGRESS', 
    count: productosAcumulados.length, 
    status: 'running' 
  });

  // 3. Verificar Meta
  if (productosAcumulados.length >= objetivo) {
    terminarScraping();
  } else {
    intentarPaginar(keyword);
  }
}

function intentarPaginar(keyword: string) {
    const nextBtn = document.querySelector('a[title="Siguiente"], a.andes-pagination__link--next') as HTMLElement;
    
    if (nextBtn) {
        console.log('[ML] Guardando y navegando...');
        
        // --- FIX CRÍTICO: GUARDAR ANTES DE CLICK ---
        sessionStorage.setItem('krowdy_ml_progress', JSON.stringify({
            keyword: keyword,
            productos: productosAcumulados
        }));

        nextBtn.click();
    } else {
        console.log('[ML] No hay más páginas.');
        terminarScraping();
    }
}

function terminarScraping() {
    console.log('[ML] TERMINADO.');
    if (puerto) puerto.postMessage({ type: 'RESULT', products: productosAcumulados });
    sessionStorage.removeItem('krowdy_ml_progress');
}