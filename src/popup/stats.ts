import { Product } from '../types';
import Chart from 'chart.js/auto';

// Leer keyword de la URL
const params = new URLSearchParams(window.location.search);
const keyword = params.get('keyword') || '';
document.getElementById('keywordTitle')!.textContent = keyword;

async function init() {
  const keyFala = `products_falabella_${keyword}`;
  const keyML = `products_mercadolibre_${keyword}`;

  // Recuperamos los datos guardados por el background
  const data = await chrome.storage.local.get([keyFala, keyML]);
  const falaProducts: Product[] = data[keyFala] || [];
  const mlProducts: Product[] = data[keyML] || [];

  if (falaProducts.length === 0 && mlProducts.length === 0) {
    document.getElementById('recommendation')!.textContent = "Sin datos. Ejecuta una búsqueda primero.";
    return;
  }

  analizarDatos(falaProducts, mlProducts);
}

function analizarDatos(fala: Product[], ml: Product[]) {
  // 1. Limpieza (Filtrar precios 0 o inválidos)
  const cleanFala = fala.filter(p => p.priceNumeric > 0);
  const cleanML = ml.filter(p => p.priceNumeric > 0);

  // 2. Calcular Promedios
  const avgF = getAverage(cleanFala);
  const avgM = getAverage(cleanML);

  // 3. Mostrar KPIs
  document.getElementById('avgFala')!.textContent = `S/ ${avgF.toFixed(2)}`;
  document.getElementById('avgML')!.textContent = `S/ ${avgM.toFixed(2)}`;

  // 4. Recomendación
  const recEl = document.getElementById('recommendation')!;
  if (avgF > 0 && avgM > 0) {
      if (avgF < avgM) {
          recEl.textContent = `Falabella es un ${(100 - (avgF/avgM)*100).toFixed(0)}% más barato en promedio.`;
      } else {
          recEl.textContent = `MercadoLibre es un ${(100 - (avgM/avgF)*100).toFixed(0)}% más barato en promedio.`;
      }
  } else {
      recEl.textContent = "Faltan datos para comparar.";
  }

  // 5. Gráfico
  renderChart(avgF, avgM);

  // 6. Tabla Top 5 (Mezclamos ambas listas y ordenamos por precio)
  const all = [...cleanFala, ...cleanML].sort((a, b) => a.priceNumeric - b.priceNumeric).slice(0, 5);
  const tbody = document.getElementById('topDealsBody')!;
  
  tbody.innerHTML = all.map(p => `
    <tr class="border-b">
        <td class="px-2 py-2 font-bold ${p.site === 'falabella' ? 'text-green-600' : 'text-yellow-600'} text-xs uppercase">${p.site}</td>
        <td class="px-2 py-2 truncate max-w-[120px]" title="${p.title}">
            <a href="${p.url}" target="_blank" class="text-blue-600 hover:underline">${p.title}</a>
        </td>
        <td class="px-2 py-2 font-mono">S/ ${p.priceNumeric}</td>
    </tr>
  `).join('');
}

function getAverage(list: Product[]) {
    if (!list.length) return 0;
    return list.reduce((sum, p) => sum + p.priceNumeric, 0) / list.length;
}

function renderChart(fala: number, ml: number) {
    const ctx = document.getElementById('priceChart') as HTMLCanvasElement;
    // @ts-ignore
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Falabella', 'MercadoLibre'],
            datasets: [{
                label: 'Precio Promedio (S/)',
                data: [fala, ml],
                backgroundColor: ['#10b981', '#f59e0b']
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

init();