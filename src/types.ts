// src/types.ts

// Estado posible de una búsqueda [cite: 9]
export type ScrapingStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

// Estructura de cada producto normalizado [cite: 22]
export interface Product {
  site: 'falabella' | 'mercadolibre';
  keyword: string;
  timestamp: string; // ISO Date
  position: number;
  title: string;
  priceVisible: string; // "S/ 100.00"
  priceNumeric: number; // 100.00
  url: string;
  brand?: string | null; // Opcional
  seller?: string | null; // Opcional
}

// Estructura de una Keyword guardada
export interface KeywordData {
  term: string;
  falabellaStatus: ScrapingStatus;
  mlStatus: ScrapingStatus;
  falabellaCount: number; // Contador de productos [cite: 10]
  mlCount: number;
  lastUpdated?: number;
}

// Mensajes para la comunicación por puertos [cite: 25]
export type PortMessage = 
  | { type: 'START'; keyword: string; site: 'falabella' | 'mercadolibre' }
  | { type: 'CANCEL' }
  | { type: 'PROGRESS'; count: number; status: string }
  | { type: 'RESULT'; products: Product[] }
  | { type: 'ERROR'; message: string };