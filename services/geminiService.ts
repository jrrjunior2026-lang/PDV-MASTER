import { GoogleGenAI, Type } from "@google/genai";
import { IDashboardStats, IProduct, ISale } from "../types";

// Safety check for API Key
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  /**
   * Analyzes sales data to provide business insights
   */
  analyzeBusiness: async (sales: ISale[], products: IProduct[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Configuração de API necessária para insights.";

    const salesSummary = sales.slice(-50).map(s => ({
      date: s.date.split('T')[0],
      total: s.total,
      items: s.items.map(i => i.name).join(', ')
    }));

    const stockSummary = products.filter(p => p.stock < p.minStock).map(p => p.name);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analise estes dados de varejo (supermercado brasileiro).
        Vendas recentes: ${JSON.stringify(salesSummary)}
        Estoque Baixo: ${JSON.stringify(stockSummary)}
        
        Forneça um relatório conciso de 3 pontos:
        1. Tendência de vendas.
        2. Alerta de ruptura de estoque crítico.
        3. Sugestão de ação para o gerente.
        Use português formal de negócios.`,
      });
      return response.text || "Não foi possível gerar análise.";
    } catch (error) {
      console.error(error);
      return "Erro ao conectar com servidor de IA.";
    }
  },

  /**
   * Helps identify NCM/Fiscal classification anomalies
   */
  auditProduct: async (productName: string, currentNcm: string) => {
    const ai = getClient();
    if (!ai) return null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Para o produto de varejo brasileiro "${productName}", o NCM "${currentNcm}" parece correto? 
        Se não, sugira o código NCM mais provável. 
        Responda apenas JSON no formato: {"valid": boolean, "suggestion": string, "reason": string}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    valid: { type: Type.BOOLEAN },
                    suggestion: { type: Type.STRING },
                    reason: { type: Type.STRING }
                }
            }
        }
      });
      return JSON.parse(response.text);
    } catch (e) {
      return null;
    }
  }
};