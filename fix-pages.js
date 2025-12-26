// Script para corrigir todas as páginas - Async/Await Migration
// Execute: node fix-pages.js

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'pages');

const fixes = {
    'CRM.tsx': {
        from: `  const refreshData = () => {
    setCustomers(StorageService.getCustomers());
    setSales(StorageService.getSales());
  };`,
        to: `  const refreshData = async () => {
    const [customersData, salesData] = await Promise.all([
      StorageService.getCustomers(),
      StorageService.getSales()
    ]);
    setCustomers(customersData);
    setSales(salesData);
  };`
    },

    'Finance.tsx': {
        from: `const data = StorageService.getFinancialRecords();`,
        to: `const [data, setData] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      const records = await StorageService.getFinancialRecords();
      setData(records);
    };
    loadData();
  }, []);`
    }
};

console.log('🔧 Iniciando correção das páginas...\n');

Object.entries(fixes).forEach(([filename, { from, to }]) => {
    const filePath = path.join(pagesDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${filename} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(from)) {
        content = content.replace(from, to);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filename} corrigido`);
    } else {
        console.log(`ℹ️  ${filename} já está correto ou padrão não encontrado`);
    }
});

console.log('\n✨ Correção concluída!');
