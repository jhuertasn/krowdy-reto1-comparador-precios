import { Product } from '../types';
import Chart from 'chart.js/auto';

const params = new URLSearchParams(window.location.search);
const keyword = params.get('keyword') || '';
document.getElementById('keywordTitle')!.textContent = keyword;

async function init() {
  const keyFala = `products_falabella_${keyword}`;
  const keyML = `products_mercadolibre_${keyword}`;

  const data = await chrome.storage.local.get([keyFala, keyML]);
  const prodsFala: Product[] = data[keyFala] || [];
  const prodsML: Product[] = data[keyML] || [];

  if (prodsFala.length === 0 && prodsML.length === 0) {
    document.getElementById('recommendation')!.textContent = "Sin datos. Ejecuta una búsqueda primero.";
    return;
  }

  analizarDatos(prodsFala, prodsML);
}

// --- FUNCIÓN NUEVA: LIMPIEZA DE DATOS (ADIÓS AL 9000 SOLES) ---
function eliminarAtipicos(products: Product[]) {
    if (products.length < 4) return products; // Si son poquitos, no filtramos

    // Ordenamos por precio
    const sorted = [...products].sort((a, b) => a.priceNumeric - b.priceNumeric);
    const values = sorted.map(p => p.priceNumeric);

    // Calculamos Cuartiles (Matemática para detectar locuras)
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1; // Rango Intercuartil

    // Definimos el límite máximo permitido (Todo lo que pase esto es basura)
    const limiteSuperior = q3 + (1.5 * iqr);

    // Filtramos
    return sorted.filter(p => p.priceNumeric <= limiteSuperior);
}

function analizarDatos(fala: Product[], ml: Product[]) {
  // 1. Limpieza Básica (Quitar ceros)
  let cleanFala = fala.filter(p => p.priceNumeric > 0);
  let cleanML = ml.filter(p => p.priceNumeric > 0);

  // 2. LIMPIEZA AVANZADA (Quitar Outliers como el de 9000 soles)
  cleanFala = eliminarAtipicos(cleanFala);
  cleanML = eliminarAtipicos(cleanML);

  // Función para calcular Mediana (Más exacta que el promedio)
  const getMedian = (list: Product[]) => {
      if (!list.length) return 0;
      const mid = Math.floor(list.length / 2);
      const sorted = [...list].sort((a, b) => a.priceNumeric - b.priceNumeric);
      return list.length % 2 !== 0 ? sorted[mid].priceNumeric : (sorted[mid - 1].priceNumeric + sorted[mid].priceNumeric) / 2;
  };

  const statsF = {
      median: getMedian(cleanFala),
      min: cleanFala.length ? Math.min(...cleanFala.map(p => p.priceNumeric)) : 0,
      max: cleanFala.length ? Math.max(...cleanFala.map(p => p.priceNumeric)) : 0,
      count: cleanFala.length
  };

  const statsM = {
      median: getMedian(cleanML),
      min: cleanML.length ? Math.min(...cleanML.map(p => p.priceNumeric)) : 0,
      max: cleanML.length ? Math.max(...cleanML.map(p => p.priceNumeric)) : 0,
      count: cleanML.length
  };

  // 3. Renderizar KPIs (Ahora usamos MEDIANA)
  document.getElementById('avgFala')!.textContent = `S/ ${statsF.median.toFixed(0)}`;
  document.getElementById('minFala')!.textContent = `S/ ${statsF.min}`;
  document.getElementById('maxFala')!.textContent = `S/ ${statsF.max}`;
  document.getElementById('countFala')!.textContent = `${statsF.count}`;

  document.getElementById('avgML')!.textContent = `S/ ${statsM.median.toFixed(0)}`;
  document.getElementById('minML')!.textContent = `S/ ${statsM.min}`;
  document.getElementById('maxML')!.textContent = `S/ ${statsM.max}`;
  document.getElementById('countML')!.textContent = `${statsM.count}`;

  // 4. Recomendación
  const recEl = document.getElementById('recommendation')!;
  const saveEl = document.getElementById('savingText')!;
  
  if (statsF.count > 0 && statsM.count > 0) {
      if (statsF.median < statsM.median) {
          const diff = ((1 - (statsF.median / statsM.median)) * 100).toFixed(0);
          recEl.textContent = "Falabella gana (Mediana)";
          saveEl.textContent = `~${diff}% más barato vs ML`;
      } else {
          const diff = ((1 - (statsM.median / statsF.median)) * 100).toFixed(0);
          recEl.textContent = "MercadoLibre gana (Mediana)";
          saveEl.textContent = `~${diff}% más barato vs Falabella`;
      }
  } else {
      recEl.textContent = "Datos insuficientes";
      saveEl.textContent = "--";
  }

  // 5. Gráfico (Actualizado con Mediana)
  renderChart(statsF.median, statsM.median);

  // 6. Tabla Top 5 (Mezclada)
  const all = [...cleanFala, ...cleanML].sort((a, b) => a.priceNumeric - b.priceNumeric).slice(0, 5);
  const tbody = document.getElementById('topDealsBody')!;
  
  tbody.innerHTML = all.map((p, index) => {
    const isFala = p.site === 'falabella';
    const badgeColor = isFala ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    return `
    <tr class="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
        <td class="px-5 py-3">
            <div class="flex items-center">
                <span class="text-gray-500 font-bold mr-3 text-xs">#${index + 1}</span>
                <div class="truncate max-w-[200px]" title="${p.title}">
                    <a href="${p.url}" target="_blank" class="text-gray-700 font-medium hover:text-indigo-600 hover:underline">
                        ${p.title}
                    </a>
                </div>
            </div>
        </td>
        <td class="px-5 py-3 text-center">
            <span class="${badgeColor} px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                ${p.site}
            </span>
        </td>
        <td class="px-5 py-3 text-right font-mono font-bold text-gray-800">
            S/ ${p.priceNumeric}
        </td>
    </tr>
  `}).join('');
}

function renderChart(fala: number, ml: number) {
    const canvas = document.getElementById('priceChart') as HTMLCanvasElement;
    // @ts-ignore
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    // @ts-ignore
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Falabella', 'Mercado Libre'],
            datasets: [{
                label: 'Precio Mediana (S/)', // Etiqueta actualizada
                data: [fala, ml],
                backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'],
                borderColor: ['rgb(16, 185, 129)', 'rgb(245, 158, 11)'],
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            }
        }
    });
}

init();