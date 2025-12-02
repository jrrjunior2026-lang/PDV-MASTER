

import { IProduct } from "../types";

// Headers definition for the CSV file
const PRODUCT_HEADERS = [
  { label: 'CODIGO_BARRAS', key: 'code' },
  { label: 'NOME_PRODUTO', key: 'name' },
  { label: 'PRECO_VENDA', key: 'price' },
  { label: 'PRECO_CUSTO', key: 'cost' },
  { label: 'ESTOQUE_ATUAL', key: 'stock' },
  { label: 'ESTOQUE_MINIMO', key: 'minStock' },
  { label: 'UNIDADE', key: 'unit' },
  { label: 'NCM', key: 'ncm' },
  { label: 'CEST', key: 'cest' },
  { label: 'ORIGEM', key: 'origin' }, // 0 or 1
  { label: 'GRUPO_TRIB', key: 'taxGroup' }, // A, B, C
];

export const CsvService = {

  exportToCsv: (data: any[], headers: {label: string, key: string}[], filename: string) => {
    if (data.length === 0) return;

    const headerRow = headers.map(h => h.label).join(';');
    const dataRows = data.map(row => 
        headers.map(h => {
            let val = row[h.key];
            if (val === undefined || val === null) val = '';
            if (typeof val === 'number') return val.toString().replace('.', ',');
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
            return val;
        }).join(';')
    );

    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  /**
   * Generates a CSV file and triggers download
   */
  exportProducts: (products: IProduct[]) => {
    // 1. Create Header Row
    const headerRow = PRODUCT_HEADERS.map(h => h.label).join(';');
    
    // 2. Create Data Rows
    const dataRows = products.map(p => {
      return PRODUCT_HEADERS.map(h => {
        const val = p[h.key as keyof IProduct];
        // Handle undefined/null
        if (val === undefined || val === null) return '';
        // Handle numbers (replace dot with comma for Brazilian Excel)
        if (typeof val === 'number') return val.toString().replace('.', ',');
        // Escape semicolons in text to avoid breaking CSV
        return String(val).replace(/;/g, ' ');
      }).join(';');
    });

    // 3. Combine with BOM for UTF-8 support in Excel
    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n');
    
    // 4. Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_estoque_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Generates a template file
   */
  downloadTemplate: () => {
    const headerRow = PRODUCT_HEADERS.map(h => h.label).join(';');
    const exampleRow = "789000000000;PRODUTO EXEMPLO;10,00;5,00;100;10;UN;0000.00.00;00.000.00;0;A";
    const csvContent = '\uFEFF' + [headerRow, exampleRow].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_produtos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Parses CSV file content to Product Objects
   */
  parseCsv: async (file: File): Promise<Partial<IProduct>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return resolve([]);

        const lines = text.split('\n');
        // Remove empty lines
        const cleanLines = lines.filter(l => l.trim().length > 0);
        
        if (cleanLines.length < 2) return resolve([]); // Only header or empty

        const headers = cleanLines[0].split(';').map(h => h.trim());
        const result: Partial<IProduct>[] = [];

        for (let i = 1; i < cleanLines.length; i++) {
          const currentLine = cleanLines[i].split(';');
          // Skip malformed lines
          if (currentLine.length < PRODUCT_HEADERS.length) continue;

          const product: any = { id: crypto.randomUUID() }; // Generate temporary ID
          
          PRODUCT_HEADERS.forEach((h, index) => {
            const rawValue = currentLine[index]?.trim();
            
            // Map Value based on type
            if (['price', 'cost', 'stock', 'minStock'].includes(h.key)) {
              // Parse number (handle 10,00 -> 10.00)
              product[h.key] = parseFloat(rawValue.replace(',', '.')) || 0;
            } else {
              product[h.key] = rawValue;
            }
          });

          // Basic validation
          if (product.code && product.name) {
             result.push(product);
          }
        }
        resolve(result);
      };

      reader.onerror = () => reject("Erro ao ler arquivo");
      reader.readAsText(file, 'UTF-8');
    });
  }
};