# 🕵️‍♂️ Krowdy Reto 1 de comparador de precios con Scraping

> **Reto Técnico de Web Scraping & Análisis de Datos**

Una extensión de Google Chrome desarrollada con **TypeScript** y **Vite** que permite a los usuarios comparar precios de productos en tiempo real entre **Falabella** y **MercadoLibre**. La herramienta automatiza la búsqueda, extracción (scraping) y análisis estadístico de los datos para encontrar las mejores oportunidades de ahorro.

---

## 🚀 Características Principales

* **Gestión de Keywords:** Interfaz intuitiva para agregar, persistir y eliminar términos de búsqueda.
* **Scraping Robusto:**
    * **Falabella:** Soporte para *Single Page Applications* (SPA) y carga dinámica.
    * **MercadoLibre:** Sistema de **Paginación Automática** inteligente que navega entre páginas para alcanzar la cuota de productos.
* **Persistencia de Datos:** Arquitectura basada en `Background Service Workers` que mantiene el proceso vivo aunque se cierre el popup.
* **Dashboard de Análisis:**
    * Cálculo de **Mediana** (para evitar sesgos por precios extremos).
    * Detección y eliminación de **Outliers** (valores atípicos) usando Rango Intercuartil (IQR).
    * Gráficos comparativos con **Chart.js**.
    * Interfaz moderna y responsiva.

---

## 🛠️ Tecnologías Utilizadas

* **Core:** TypeScript (Vanilla), HTML5, CSS3.
* **Build Tool:** Vite (Rollup).
* **Chrome API:** Manifest V3 (`storage`, `tabs`, `scripting`, `runtime`).
* **Librerías:** * `Chart.js` (Visualización de datos).
    * `Tailwind CSS` (Estilos del dashboard).

---

## 📥 Guía de Instalación

Sigue estos pasos para probar la extensión en tu navegador:

### 1. Clonar el Repositorio
```bash
git clone [https://github.com/TU_USUARIO/krowdy-comparador-precios.git](https://github.com/TU_USUARIO/krowdy-comparador-precios.git)
cd krowdy-comparador-precios

```
### 2. Instalar Dependencias

Necesitas tener Node.js instalado.

```bash
npm install
```

### 3. Compilar el Proyecto

Esto generará la carpeta /dist con el código optimizado para Chrome.

```bash
npm run build
```

### 4. Cargar en Chrome

1.- Abre Google Chrome y ve a chrome://extensions/.

2.- Activa el "Modo de desarrollador" (esquina superior derecha).

3.- Haz clic en "Cargar descomprimida" (Load unpacked).

4.- Selecciona la carpeta dist que se generó dentro de tu proyecto.


### Manual de Uso

1.- Abrir la Extensión: Haz clic en el icono del rompecabezas en Chrome y selecciona "Comparador Krowdy".

2.- Agregar Producto: Escribe el nombre del producto (ej: "Monitor Gamer") y dale al botón +.

3.- Iniciar Búsqueda:

- Haz clic en "Buscar" en la fila de Falabella. Se abrirá una pestaña y comenzará a extraer datos. Espera a que el contador llegue a 60+ y diga Done.

- Haz clic en "Buscar" en la fila de MercadoLibre. Verás cómo la extensión navega sola por las páginas hasta llegar a 100+ productos.

4.- Ver Resultados:

- Una vez que ambos sitios estén en verde (Done), aparecerá el botón "📊 Ver Estadísticas".

- Haz clic para abrir el Dashboard con el análisis de precios, gráficas y la recomendación de compra.

### Criterios Técnicos

### Criterio de Similitud (Agrupación)

Para agrupar productos comparables, se utiliza un enfoque basado en la intención de búsqueda exacta.

Se asume que los resultados devueltos por los motores de búsqueda de Falabella y MercadoLibre para una keyword específica (ej: "Playstation 5") son contextualmente relevantes.

Limitación: Si la tienda devuelve accesorios (ej: "Control de PS5") mezclados con consolas, estos se filtran en la siguiente etapa.

### Limpieza Estadística (Filtro IQR)

Para resolver el problema de precios "basura" (ej: un tornillo de S/ 10 apareciendo en una búsqueda de Laptops, o una PC de S/ 9000 en una búsqueda de Teclados), implementé un filtro de Rango Intercuartil (IQR).

Se ordenan los precios y se calculan el cuartil 1 (Q1) y cuartil 3 (Q3).

Se define el IQR como Q3 - Q1.

Cualquier producto cuyo precio supere Q3 + 1.5 * IQR es considerado un Outlier y se descarta del análisis.

### Mediana vs. Promedio

Para la recomendación final, se utiliza la Mediana en lugar del Promedio aritmético.

¿Por qué? El promedio es muy sensible a valores extremos. La mediana ofrece una representación mucho más fiel del "precio de mercado" real que verá el usuario.


### Estructura del Proyecto

src/
├── background/      # Service Worker (Manejo de conexiones persistentes)
├── content/         # Scripts inyectados (Scrapers de Falabella y ML)
├── popup/           # Lógica e interfaz de la ventana emergente
│   ├── popup.html
│   ├── popup.ts
│   ├── stats.html   # Dashboard de análisis
│   └── stats.ts     # Lógica de gráficos y cálculos
├── utils/           # Tipos y utilidades
└── manifest.json    # Configuración de la extensión V3