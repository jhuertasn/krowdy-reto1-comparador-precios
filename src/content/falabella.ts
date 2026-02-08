import { PortMessage, Product } from '../types';

console.log('Falabella Scraper: Cargado 🟢');

let puerto: chrome.runtime.Port | null = null;
let objetivo = 60;
let productosAcumulados: Product[] = [];
let buscando = false;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'krowdy_scraping') return;
  puerto = port;

  port.onMessage.addListener((msg: PortMessage) => {
    if (msg.type === 'START') {
      console.log('[Falabella] Iniciando:', msg.keyword);
      productosAcumulados = [];
      buscando = true;
      procesarPagina(msg.keyword);
    }
  });
});

function extraerProductos(keyword: string): Product[] {
  const tarjetas = document.querySelectorAll('[data-testid=ssr-pod], .pod-item'); // Selectores Falabella
  return Array.from(tarjetas).map((t, i) => {
    const el = t as HTMLElement;
    const [marca, nombre, ...resto] = el.innerText.split('\n');
    const precioLine = resto.find(r => r.includes('S/')) || '0';
    const precioNum = parseFloat(precioLine.replace(/[^0-9.]/g, ''));
    
    return {
        site: 'falabella',
        keyword,
        timestamp: new Date().toISOString(),
        position: productosAcumulados.length + i + 1,
        title: nombre || 'Sin nombre',
        priceVisible: precioLine,
        priceNumeric: isNaN(precioNum) ? 0 : precioNum,
        url: window.location.href, // Falabella complica sacar la URL individual a veces
        brand: marca
    };
  });
}

// Función recursiva para SPAs
function procesarPagina(keyword: string) {
    if (!buscando || !puerto) return;

    // 1. Extraer lo que vemos
    const nuevos = extraerProductos(keyword);
    // Filtro simple para no repetir lo mismo si Falabella tarda en cambiar
    const unicos = nuevos.filter(n => !productosAcumulados.some(p => p.title === n.title));
    
    if (unicos.length > 0) {
        productosAcumulados = [...productosAcumulados, ...unicos];
        puerto.postMessage({ type: 'PROGRESS', count: productosAcumulados.length, status: 'running' });
    }

    // 2. ¿Meta cumplida?
    if (productosAcumulados.length >= objetivo) {
        puerto.postMessage({ type: 'RESULT', products: productosAcumulados });
        buscando = false;
        return;
    }

    // 3. Paginar
    const nextBtn = document.querySelector('button#testId-pagination-bottom-arrow-right, i.csicon-arrow_right') as HTMLElement;
    
    if (nextBtn && !nextBtn.closest('button')?.disabled) {
        console.log('[Falabella] Clic en siguiente...');
        nextBtn.click();
        
        // --- ESPERA ACTIVA ---
        // Esperamos 4 segundos a que el contenido cambie antes de volver a leer
        setTimeout(() => {
            procesarPagina(keyword);
        }, 4000);
    } else {
        console.log('[Falabella] Fin de resultados');
        puerto.postMessage({ type: 'RESULT', products: productosAcumulados });
        buscando = false;
    }
}