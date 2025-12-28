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

        const getTagValue = (parent: Element | Document, tagName: string) => {
            const el = parent.getElementsByTagName(tagName)[0];
            return el ? el.textContent : '';
        };

        // 1. Access Key (Chave de Acesso)
        const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
        const accessKey = infNFe ? infNFe.getAttribute('Id')?.replace('NFe', '') || '' : '';

        // 2. Identification
        const ide = xmlDoc.getElementsByTagName('ide')[0];
        const number = getTagValue(ide, 'nNF') || '';
        const series = getTagValue(ide, 'serie') || '';
        const date = getTagValue(ide, 'dhEmi') || '';

        // 3. Supplier (Emitente)
        const emit = xmlDoc.getElementsByTagName('emit')[0];
        const supplier: Partial<ISupplier> = {
            name: getTagValue(emit, 'xNome') || '',
            document: getTagValue(emit, 'CNPJ') || '',
            phone: getTagValue(emit, 'fone') || '',
            address: `${getTagValue(emit, 'xLgr')}, ${getTagValue(emit, 'nro')} - ${getTagValue(emit, 'xBairro')}, ${getTagValue(emit, 'xMun')}/${getTagValue(emit, 'UF')}`
        };

        // 4. Products (Detalhamento)
        const products: any[] = [];
        const detList = xmlDoc.getElementsByTagName('det');
        for (let i = 0; i < detList.length; i++) {
            const det = detList[i];
            const prod = det.getElementsByTagName('prod')[0];

            products.push({
                code: getTagValue(prod, 'cEAN') !== 'SEM GTIN' ? getTagValue(prod, 'cEAN') : getTagValue(prod, 'cProd'),
                name: getTagValue(prod, 'xProd'),
                ncm: getTagValue(prod, 'NCM'),
                unit: getTagValue(prod, 'uCom'),
                quantity: parseFloat(getTagValue(prod, 'qCom') || '0'),
                cost: parseFloat(getTagValue(prod, 'vUnCom') || '0'),
                price: parseFloat(getTagValue(prod, 'vUnCom') || '0') * 1.5, // Sugestão de 50% de margem
            });
        }

        // 5. Total
        const total = xmlDoc.getElementsByTagName('total')[0];
        const icmsTot = total.getElementsByTagName('ICMSTot')[0];
        const totalValue = parseFloat(getTagValue(icmsTot, 'vNF') || '0');

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
