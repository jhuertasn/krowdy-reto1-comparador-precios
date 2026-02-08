import { KeywordData, PortMessage } from '../types';

// Mapa para mantener las conexiones vivas
const connections = new Map<number, chrome.runtime.Port>();

// 1. ESCUCHAR LA ORDEN DEL POPUP
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INIT_SEARCH') {
    console.log('[Background] Orden recibida:', msg);
    iniciarBusquedaBackground(msg.keyword, msg.site);
    sendResponse({ status: 'ok' });
  }
  return true; 
});

// 2. ABRIR PESTAÑA Y CONECTAR
async function iniciarBusquedaBackground(keyword: string, site: 'falabella' | 'mercadolibre') {
  const baseUrl = site === 'falabella' 
    ? `https://www.falabella.com.pe/falabella-pe/search?Ntt=${encodeURIComponent(keyword)}`
    : `https://listado.mercadolibre.com.pe/${encodeURIComponent(keyword)}`;

  // Creamos la pestaña
  const tab = await chrome.tabs.create({ url: baseUrl, active: true });

  // Esperamos a que cargue
  chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
    if (tabId === tab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      
      console.log(`[Background] Conectando con ${site} en tab ${tabId}...`);
      
      // --- CONEXIÓN PERSISTENTE (El requisito del reto) ---
      const port = chrome.tabs.connect(tabId, { name: 'krowdy_scraping' });
      
      // Guardamos la referencia
      connections.set(tabId, port);

      // Enviamos la orden de inicio al Content Script
      port.postMessage({ type: 'START', keyword, site });

      // Escuchamos lo que nos dice el Content Script
      port.onMessage.addListener(async (msg: any) => {
        const message = msg as PortMessage; // Casteo simple

        if (message.type === 'PROGRESS') {
           // @ts-ignore: Accedemos a count si existe
           await actualizarProgreso(keyword, site, 'running', message.count);
        } 
        else if (message.type === 'RESULT') {
           // @ts-ignore: Accedemos a products si existe
           await actualizarProgreso(keyword, site, 'done', message.products.length);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log(`[Background] Desconectado del tab ${tabId}`);
        connections.delete(tabId);
      });
    }
  });
}

// 3. ACTUALIZAR BASE DE DATOS (Storage)
async function actualizarProgreso(term: string, site: 'falabella'|'mercadolibre', status: string, count: number) {
  const data = await chrome.storage.local.get(['krowdy_keywords']);
  const keywords: KeywordData[] = data.krowdy_keywords || [];
  
  const index = keywords.findIndex(k => k.term === term);
  if (index !== -1) {
    if (site === 'falabella') {
      // @ts-ignore
      keywords[index].falabellaStatus = status;
      keywords[index].falabellaCount = count;
    } else {
      // @ts-ignore
      keywords[index].mlStatus = status;
      keywords[index].mlCount = count;
    }
    // Guardamos: Esto disparará el evento onChanged en el Popup
    await chrome.storage.local.set({ krowdy_keywords: keywords });
  }
}

// --- NUEVO: ESCUCHAR RECONEXIONES DEL CONTENT SCRIPT ---
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'krowdy_scraping' && port.sender?.tab?.id) {
    console.log('[Background] Reconexión detectada desde tab:', port.sender.tab.id);
    
    // Reconectamos listeners para seguir escuchando el progreso de la página 2, 3...
    port.onMessage.addListener(async (msg: any) => {
       const message = msg as PortMessage;
       // Recuperamos la keyword del storage o del mensaje si lo enviáramos
       // Para simplificar, asumimos que el mensaje trae datos suficientes o
       // actualizamos solo en base a lo que recibimos.
       
       if (message.type === 'PROGRESS') {
           // Nota: Aquí hay un pequeño hack. Como al reconectar no sabemos qué keyword era,
           // necesitamos buscar qué keyword estaba "running" en ML en nuestro storage.
           const keywordRunning = await buscarKeywordActiva('mercadolibre');
           if (keywordRunning) {
               await actualizarProgreso(keywordRunning, 'mercadolibre', 'running', message.count);
           }
       } 
       else if (message.type === 'RESULT') {
           const keywordRunning = await buscarKeywordActiva('mercadolibre');
           if (keywordRunning) {
               await actualizarProgreso(keywordRunning, 'mercadolibre', 'done', message.products.length);
               // Aquí guardaríamos los productos en storage.local bajo otra key
               await chrome.storage.local.set({ [`products_mercadolibre_${keywordRunning}`]: message.products });
           }
       }
    });
  }
});

// Helper para encontrar quién estaba corriendo
async function buscarKeywordActiva(site: 'falabella'|'mercadolibre'): Promise<string | null> {
    const data = await chrome.storage.local.get(['krowdy_keywords']);
    const keywords: KeywordData[] = data.krowdy_keywords || [];
    const found = keywords.find(k => (site === 'falabella' ? k.falabellaStatus : k.mlStatus) === 'running');
    return found ? found.term : null;
}