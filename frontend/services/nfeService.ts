import { IProduct, ISupplier } from '../types';

export interface INfeData {
    accessKey: string;
    number: string;
    series: string;
    date: string;
    supplier: Partial<ISupplier>;
    products: Partial<IProduct & { quantity: number }>[];
    totalValue: number;
}

export const NfeService = {
    parseXml: (xmlString: string): INfeData => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // Verificar erros de parsing
        const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
        if (parserError) {
            throw new Error('Erro ao processar XML. Verifique se o arquivo é uma NF-e válida.');
        }

        // Função auxiliar para buscar tags com ou sem namespace
        const getTagValue = (parent: Element | Document | null, tagName: string): string => {
            if (!parent) return '';
            
            // Tentar buscar com namespace
            let el = parent.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', tagName)[0];
            if (!el) {
                // Tentar sem namespace
                el = parent.getElementsByTagName(tagName)[0];
            }
            return el ? (el.textContent || '').trim() : '';
        };

        // Função auxiliar para buscar elementos com ou sem namespace
        const getElement = (parent: Element | Document, tagName: string): Element | null => {
            let el = parent.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', tagName)[0];
            if (!el) {
                el = parent.getElementsByTagName(tagName)[0];
            }
            return el || null;
        };

        // 1. Access Key (Chave de Acesso)
        const infNFe = getElement(xmlDoc, 'infNFe');
        if (!infNFe) {
            throw new Error('XML inválido: tag infNFe não encontrada. Verifique se é uma NF-e válida.');
        }
        const accessKey = infNFe.getAttribute('Id')?.replace('NFe', '') || '';

        // 2. Identification
        const ide = getElement(xmlDoc, 'ide');
        if (!ide) {
            throw new Error('XML inválido: tag ide não encontrada.');
        }
        const number = getTagValue(ide, 'nNF') || '';
        const series = getTagValue(ide, 'serie') || '';
        const date = getTagValue(ide, 'dhEmi') || getTagValue(ide, 'dEmi') || '';

        if (!number) {
            throw new Error('XML inválido: número da NF-e não encontrado.');
        }

        // 3. Supplier (Emitente)
        const emit = getElement(xmlDoc, 'emit');
        if (!emit) {
            throw new Error('XML inválido: dados do emitente não encontrados.');
        }

        const supplierName = getTagValue(emit, 'xNome') || getTagValue(emit, 'xFant') || '';
        const supplierDoc = getTagValue(emit, 'CNPJ') || getTagValue(emit, 'CPF') || '';
        
        if (!supplierName || !supplierDoc) {
            throw new Error('XML inválido: dados incompletos do fornecedor (nome ou documento faltando).');
        }

        // Construir endereço
        const endereco = getElement(emit, 'enderEmit');
        let address = '';
        if (endereco) {
            const logradouro = getTagValue(endereco, 'xLgr') || '';
            const numero = getTagValue(endereco, 'nro') || '';
            const bairro = getTagValue(endereco, 'xBairro') || '';
            const municipio = getTagValue(endereco, 'xMun') || '';
            const uf = getTagValue(endereco, 'UF') || '';
            const cep = getTagValue(endereco, 'CEP') || '';
            
            const parts = [logradouro, numero, bairro, municipio, uf].filter(p => p);
            address = parts.join(', ');
            if (cep) address += ` - CEP: ${cep}`;
        } else {
            // Fallback: tentar buscar diretamente
            address = `${getTagValue(emit, 'xLgr')}, ${getTagValue(emit, 'nro')} - ${getTagValue(emit, 'xBairro')}, ${getTagValue(emit, 'xMun')}/${getTagValue(emit, 'UF')}`;
        }

        const supplier: Partial<ISupplier> = {
            name: supplierName,
            document: supplierDoc.replace(/\D/g, ''), // Remove caracteres não numéricos
            phone: getTagValue(emit, 'fone') || '',
            email: getTagValue(emit, 'email') || '',
            address: address || 'Endereço não informado'
        };

        // 4. Products (Detalhamento)
        const products: any[] = [];
        const detList = xmlDoc.getElementsByTagName('det');
        
        if (detList.length === 0) {
            throw new Error('XML inválido: nenhum produto encontrado na NF-e.');
        }

        for (let i = 0; i < detList.length; i++) {
            const det = detList[i];
            const prod = getElement(det, 'prod');
            
            if (!prod) {
                console.warn(`Produto ${i + 1} sem dados, pulando...`);
                continue;
            }

            const codeEAN = getTagValue(prod, 'cEAN');
            const codeProd = getTagValue(prod, 'cProd');
            const code = (codeEAN && codeEAN !== 'SEM GTIN' && codeEAN !== '0') ? codeEAN : codeProd;
            
            const name = getTagValue(prod, 'xProd');
            const quantity = parseFloat(getTagValue(prod, 'qCom') || '0');
            const cost = parseFloat(getTagValue(prod, 'vUnCom') || '0');

            if (!name || !code) {
                console.warn(`Produto ${i + 1} sem nome ou código, pulando...`);
                continue;
            }

            if (quantity <= 0 || cost <= 0) {
                console.warn(`Produto ${name} com quantidade ou custo inválido, usando valores padrão...`);
            }

            products.push({
                code: code || `PROD${i + 1}`,
                name: name || `Produto ${i + 1}`,
                ncm: getTagValue(prod, 'NCM') || '',
                unit: getTagValue(prod, 'uCom') || 'UN',
                quantity: quantity || 1,
                cost: cost || 0,
                price: cost > 0 ? cost * 1.5 : 0, // Sugestão de 50% de margem
            });
        }

        if (products.length === 0) {
            throw new Error('Nenhum produto válido encontrado na NF-e.');
        }

        // 5. Total
        const total = getElement(xmlDoc, 'total');
        let totalValue = 0;
        
        if (total) {
            const icmsTot = getElement(total, 'ICMSTot');
            if (icmsTot) {
                totalValue = parseFloat(getTagValue(icmsTot, 'vNF') || '0');
            }
        }

        // Se não encontrou o total, calcular pela soma dos produtos
        if (totalValue === 0) {
            totalValue = products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
        }

        return {
            accessKey,
            number,
            series,
            date,
            supplier,
            products,
            totalValue
        };
    }
};
