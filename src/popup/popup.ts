import { KeywordData } from '../types';

const input = document.getElementById('keywordInput') as HTMLInputElement;
const addBtn = document.getElementById('addBtn') as HTMLButtonElement;
const listContainer = document.getElementById('keywordsList') as HTMLDivElement;
const template = document.getElementById('keywordTemplate') as HTMLTemplateElement;

let keywords: KeywordData[] = [];

// 1. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.local.get(['krowdy_keywords']);
  if (result.krowdy_keywords) {
    keywords = result.krowdy_keywords;
    renderKeywords();
  }
});

// --- NUEVO: ESCUCHAR CAMBIOS AUTOMÁTICOS ---
// Esto hace que el popup se actualice solo cuando el background trabaja
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.krowdy_keywords) {
    keywords = changes.krowdy_keywords.newValue;
    renderKeywords();
  }
});

// 2. AGREGAR KEYWORD
addBtn?.addEventListener('click', () => {
  const term = input.value.trim();
  if (!term) return;

  if (keywords.some(k => k.term.toLowerCase() === term.toLowerCase())) {
    alert('Esta palabra clave ya existe');
    return;
  }

  const newKeyword: KeywordData = {
    term: term,
    falabellaStatus: 'idle',
    mlStatus: 'idle',
    falabellaCount: 0,
    mlCount: 0,
    lastUpdated: Date.now()
  };

  keywords.push(newKeyword);
  saveAndRender();
  input.value = '';
  input.focus();
});

async function saveAndRender() {
  await chrome.storage.local.set({ krowdy_keywords: keywords });
  // No llamamos a renderKeywords() aquí, dejamos que el listener onChanged lo haga
}

function renderKeywords() {
  if (!listContainer) return;
  listContainer.innerHTML = '';

  keywords.forEach((k, index) => {
    const clone = template.content.cloneNode(true) as DocumentFragment;
    
    // Asignar textos
    const termEl = clone.querySelector('.term');
    if (termEl) termEl.textContent = k.term;
    
    // UI Falabella
    const statusFalabella = clone.querySelector('.status-falabella');
    if (statusFalabella) {
        statusFalabella.textContent = k.falabellaStatus;
        statusFalabella.className = `status-badge status-falabella ${getStatusColor(k.falabellaStatus)}`;
    }
    const countFalabella = clone.querySelector('.count-falabella');
    if (countFalabella) countFalabella.textContent = String(k.falabellaCount);

    // UI MercadoLibre
    const statusMl = clone.querySelector('.status-ml');
    if (statusMl) {
        statusMl.textContent = k.mlStatus;
        statusMl.className = `status-badge status-ml ${getStatusColor(k.mlStatus)}`;
    }
    const countMl = clone.querySelector('.count-ml');
    if (countMl) countMl.textContent = String(k.mlCount);

    // Eliminar
    const deleteBtn = clone.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if(confirm(`¿Eliminar "${k.term}"?`)) {
                keywords.splice(index, 1);
                // Actualizamos storage directo
                chrome.storage.local.set({ krowdy_keywords: keywords });
            }
        });
    }

    // BOTÓN FALABELLA
    const btnFalabella = clone.querySelector('.btn-falabella') as HTMLButtonElement;
    if (btnFalabella) {
        if (k.falabellaStatus === 'running') {
            btnFalabella.textContent = '...';
            btnFalabella.disabled = true;
        }
        btnFalabella.addEventListener('click', () => {
            iniciarBusqueda(k.term, 'falabella');
        });
    }

    // BOTÓN MERCADOLIBRE
    const btnMl = clone.querySelector('.btn-ml') as HTMLButtonElement;
    if (btnMl) {
        if (k.mlStatus === 'running') {
            btnMl.textContent = '...';
            btnMl.disabled = true;
        }
        btnMl.addEventListener('click', () => {
            iniciarBusqueda(k.term, 'mercadolibre');
        });
    }


    // BOTÓN ESTADÍSTICAS (Nuevo para Fase 4)
    const btnStats = clone.querySelector('.btn-stats') as HTMLButtonElement;
    if (btnStats) {
        // Solo habilitar si hay datos (opcional, o dejar que la pag de stats avise)
        btnStats.addEventListener('click', () => {
            // Abrimos stats.html pasando la keyword en la URL
            chrome.tabs.create({ 
                url: chrome.runtime.getURL(`src/popup/stats.html?keyword=${encodeURIComponent(k.term)}`)
            });
        });
    }

    listContainer.appendChild(clone);
  });
}

function getStatusColor(status: string) {
  switch(status) {
    case 'running': return 'status-running'; 
    case 'done': return 'status-done';
    case 'error': return 'text-red-600';
    default: return 'text-gray-500';
  }
}

// --- FASE 2: ORDENAR AL BACKGROUND (CORREGIDO) ---
function iniciarBusqueda(keyword: string, site: 'falabella' | 'mercadolibre') {
  // Solo enviamos el mensaje. El background hace el trabajo sucio.
  chrome.runtime.sendMessage({ type: 'INIT_SEARCH', keyword, site });
}