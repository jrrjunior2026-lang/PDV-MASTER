export function generateINI(sale: any, items: any[], company: any, fiscal: any, customer?: any) {
    let ini = '[infNFe]\n';
    ini += 'versao=4.00\n\n';

    const isNFCe = sale.payment_method !== 'CREDIT'; // Simple logic for now
    const mod = isNFCe ? '65' : '55';

    ini += '[Identificacao]\n';
    ini += `cNF=${Math.floor(Math.random() * 100000000)}\n`;
    ini += `natOp=VENDA\n`;
    ini += `mod=${mod}\n`;
    ini += `serie=${isNFCe ? (fiscal.nfceSeries || 1) : (fiscal.nfeSeries || 1)}\n`;
    ini += `nNF=\n`; // ACBr will fill this
    ini += `dhEmi=${new Date().toISOString()}\n`;
    ini += `tpImp=1\n`;
    ini += `tpEmis=1\n`;
    ini += `tpAmb=${fiscal.environment || 2}\n`;
    ini += `finNFe=1\n`;
    ini += `indFinal=1\n`;
    ini += `indPres=1\n`;
    ini += `procEmi=0\n`;
    ini += `verProc=PDVMASTER_1.0\n\n`;

    ini += '[Emitente]\n';
    ini += `CNPJ=${company.cnpj.replace(/\D/g, '')}\n`;
    ini += `xNome=${company.corporateName}\n`;
    ini += `xFant=${company.fantasyName}\n`;
    ini += `IE=${company.ie.replace(/\D/g, '')}\n`;
    ini += `CRT=${company.taxRegime || 1}\n`;

    // Address parsing (simplified)
    const addrParts = company.address.split(',');
    ini += `xLgr=${addrParts[0]?.trim() || ''}\n`;
    ini += `nro=${addrParts[1]?.split('-')[0]?.trim() || 'SN'}\n`;
    ini += `xBairro=${addrParts[1]?.split('-')[1]?.trim() || 'CENTRO'}\n`;
    ini += `cMun=3550308\n`; // São Paulo as default, should be configurable
    ini += `xMun=SAO PAULO\n`;
    ini += `UF=SP\n`;
    ini += `CEP=01001000\n\n`;

    if (customer && customer.document) {
        ini += '[Destinatario]\n';
        const doc = customer.document.replace(/\D/g, '');
        if (doc.length === 11) {
            ini += `CPF=${doc}\n`;
        } else {
            ini += `CNPJ=${doc}\n`;
        }
        ini += `xNome=${customer.name}\n`;
        ini += `indIEDest=9\n\n`;
    }

    // Items
    items.forEach((item, index) => {
        const i = (index + 1).toString().padStart(3, '0');
        ini += `[Prod${i}]\n`;
        ini += `cProd=${item.code}\n`;
        ini += `cEAN=${item.barcode || 'SEM GTIN'}\n`;
        ini += `xProd=${item.name}\n`;
        ini += `NCM=${item.ncm ? item.ncm.replace(/\D/g, '') : '00000000'}\n`;
        ini += `CFOP=${isNFCe ? '5102' : '5102'}\n`;
        ini += `uCom=${item.unit || 'UN'}\n`;
        ini += `qCom=${item.quantity}\n`;
        ini += `vUnCom=${item.unit_price}\n`;
        ini += `vProd=${item.total}\n`;
        ini += `cEANTrib=${item.barcode || 'SEM GTIN'}\n`;
        ini += `uTrib=${item.unit || 'UN'}\n`;
        ini += `qTrib=${item.quantity}\n`;
        ini += `vUnTrib=${item.unit_price}\n`;
        ini += `indTot=1\n\n`;

        ini += `[ICMS${i}]\n`;
        ini += `orig=${item.origin || 0}\n`;
        ini += `CSOSN=102\n`; // Simples Nacional default
        // For CRT=1 (Simples Nacional), we use CSOSN
        // For CRT=3 (Normal), we use CST
    });

    ini += '[Total]\n';
    ini += `vBC=0.00\n`;
    ini += `vICMS=0.00\n`;
    ini += `vICMSDeson=0.00\n`;
    ini += `vBCST=0.00\n`;
    ini += `vST=0.00\n`;
    ini += `vProd=${sale.subtotal}\n`;
    ini += `vFrete=0.00\n`;
    ini += `vSeg=0.00\n`;
    ini += `vDesc=${sale.discount || 0}\n`;
    ini += `vII=0.00\n`;
    ini += `vIPI=0.00\n`;
    ini += `vPIS=0.00\n`;
    ini += `vCOFINS=0.00\n`;
    ini += `vOutro=0.00\n`;
    ini += `vNF=${sale.total}\n\n`;

    ini += '[DadosPag001]\n';
    ini += `tPag=${mapPaymentMethod(sale.payment_method)}\n`;
    ini += `vPag=${sale.total}\n`;
    ini += `indPag=0\n`;

    return ini;
}

function mapPaymentMethod(method: string) {
    switch (method) {
        case 'CASH': return '01';
        case 'CARD': return '03';
        case 'PIX': return '17';
        case 'CREDIT': return '05';
        default: return '99';
    }
}
