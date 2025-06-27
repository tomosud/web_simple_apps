class CostManager {
    constructor() {
        this.config = null;
        this.costData = {
            famima: [],
            line: [],
            peypey: [],
            suica: []
        };
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadAllCostData();
    }

    async loadConfig() {
        try {
            const response = await fetch('assets/cost/config.json');
            this.config = await response.json();
            console.log('Cost config loaded:', this.config);
        } catch (error) {
            console.error('Failed to load cost config:', error);
            // フォールバック設定
            this.config = {
                selection_rules: {
                    famima: { min: 2, max: 5 },
                    line: { min: 1, max: 1 },
                    peypey: { min: 1, max: 1 },
                    suica: { min: 1, max: 1 }
                },
                initial_money: 30000,
                display_duration: 3000
            };
        }
    }

    async loadAllCostData() {
        const brands = ['famima', 'line', 'peypey', 'suica'];
        
        for (const brand of brands) {
            await this.loadCostData(brand);
        }
    }

    async loadCostData(brand) {
        try {
            const response = await fetch(`assets/cost/${brand}.csv`);
            const csvText = await response.text();
            
            this.costData[brand] = this.parseCSV(csvText);
            console.log(`Loaded ${brand} cost data:`, this.costData[brand].length, 'items');
        } catch (error) {
            console.error(`Failed to load ${brand} cost data:`, error);
            this.costData[brand] = [];
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const items = [];
        
        for (const line of lines) {
            const [name, cost] = line.split(',').map(item => item.trim());
            if (name && cost) {
                items.push({
                    name: name,
                    cost: parseInt(cost, 10)
                });
            }
        }
        
        return items;
    }

    getRandomCosts(brand) {
        const brandData = this.costData[brand];
        if (!brandData || brandData.length === 0) {
            return [];
        }

        const rules = this.config.selection_rules[brand];
        if (!rules) {
            return [];
        }

        // ランダムな選択数を決定
        const selectCount = Math.floor(Math.random() * (rules.max - rules.min + 1)) + rules.min;
        
        // ランダムに選択
        const selectedItems = [];
        const availableItems = [...brandData]; // コピーを作成
        
        for (let i = 0; i < selectCount && availableItems.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableItems.length);
            selectedItems.push(availableItems.splice(randomIndex, 1)[0]);
        }
        
        return selectedItems;
    }

    getCostsForHit(brand) {
        const costs = this.getRandomCosts(brand);
        
        // ログ出力
        console.log(`${brand} costs:`, costs);
        
        return costs;
    }

    getInitialMoney() {
        return this.config ? this.config.initial_money : 30000;
    }

    getDisplayDuration() {
        return this.config ? this.config.display_duration : 3000;
    }

    // ブランド名から日本語表示名を取得
    getBrandDisplayName(brand) {
        const brandNames = {
            famima: 'ファミリーマート',
            line: 'LINE',
            peypey: 'PayPay',
            suica: 'Suica'
        };
        return brandNames[brand] || brand;
    }
}