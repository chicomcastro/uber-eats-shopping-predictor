import { writable } from 'svelte/store';

const STORAGE_KEY = 'market-purchases-data';

function createPurchaseStore() {
  const { subscribe, set, update } = writable({
    purchases: [],
    products: [],
    purchaseProducts: [],
    productMetrics: {},
    productAssociations: {} // Mapa de purchaseProductName -> productId
  });

  return {
    subscribe,
    setPurchases: (purchases) => update(state => ({ ...state, purchases })),
    setProducts: (products) => update(state => ({ ...state, products })),
    setPurchaseProducts: (purchaseProducts) => update(state => ({ ...state, purchaseProducts })),
    setProductMetrics: (productMetrics) => update(state => ({ ...state, productMetrics })),
    setProductAssociations: (productAssociations) => update(state => ({ ...state, productAssociations })),
    
    // Adiciona um novo produto base
    addProduct: (productName) => update(state => {
      if (!productName) return state;

      const existingProduct = state.products.find(p => p?.name?.toLowerCase() === productName.toLowerCase());
      if (existingProduct) return state;

      const newProduct = {
        productId: crypto.randomUUID(),
        name: productName,
        createdAt: new Date().toISOString()
      };

      return {
        ...state,
        products: [...(state.products || []), newProduct]
      };
    }),

    // Atualiza o nome de um produto
    updateProductName: (productId, newName) => update(state => {
      if (!productId || !newName) return state;

      const existingProduct = state.products.find(p => p?.name?.toLowerCase() === newName.toLowerCase() && p.productId !== productId);
      if (existingProduct) return state;

      const products = state.products.map(product => {
        if (product.productId === productId) {
          return { ...product, name: newName };
        }
        return product;
      });

      // Atualiza também as métricas para refletir o novo nome
      const productMetrics = { ...state.productMetrics };
      if (productMetrics[productId]) {
        productMetrics[productId] = {
          ...productMetrics[productId],
          productName: newName
        };
      }

      return {
        ...state,
        products,
        productMetrics
      };
    }),

    // Associa um purchaseProduct a um produto base
    associateProduct: (purchaseProductName, productId) => update(state => {
      const newAssociations = {
        ...state.productAssociations,
        [purchaseProductName]: productId
      };

      // Recalcula as métricas dos produtos
      const productMetrics = {};
      
      // Agrupa os purchaseProducts por productId usando as associações
      state.purchaseProducts.forEach(pp => {
        const associatedProductId = newAssociations[pp.productName] || null;
        if (!associatedProductId) return;

        if (!productMetrics[associatedProductId]) {
          const product = state.products.find(p => p.productId === associatedProductId);
          if (!product) return;

          productMetrics[associatedProductId] = {
            productName: product.name,
            totalInCents: 0,
            quantity: 0,
            purchases: [],
            purchaseCount: 0,
            averagePrice: 0,
            averageDaysBetweenPurchases: 0,
            variants: new Set() // Armazena as variantes do produto
          };
        }

        const metrics = productMetrics[associatedProductId];
        metrics.totalInCents += pp.totalPriceCents;
        metrics.quantity += pp.quantity;
        if (!metrics.purchases.includes(pp.purchaseId)) {
          metrics.purchases.push(pp.purchaseId);
          metrics.purchaseCount += 1;
        }
        metrics.variants.add(pp.productName);
        metrics.averagePrice = metrics.totalInCents / metrics.quantity;

        // Calcula a média de dias entre compras
        const sortedPurchases = metrics.purchases
          .map(pid => state.purchases.find(p => p.id === pid))
          .filter(Boolean)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortedPurchases.length >= 2) {
          const daysBetweenPurchases = sortedPurchases.reduce((total, purchase, index) => {
            if (index === 0) return 0;
            const daysDiff = (new Date(purchase.date) - new Date(sortedPurchases[index - 1].date)) / (1000 * 60 * 60 * 24);
            return total + daysDiff;
          }, 0);

          metrics.averageDaysBetweenPurchases = daysBetweenPurchases / (sortedPurchases.length - 1);
        }
      });

      // Converte os Sets de variantes para arrays antes de retornar
      Object.values(productMetrics).forEach(metrics => {
        metrics.variants = Array.from(metrics.variants);
      });

      return {
        ...state,
        productAssociations: newAssociations,
        productMetrics
      };
    }),

    // Remove uma associação
    removeAssociation: (purchaseProductName) => update(state => {
      const { [purchaseProductName]: removed, ...newAssociations } = state.productAssociations;
      
      // Recalcula as métricas após remover a associação
      const productMetrics = {};
      state.purchaseProducts.forEach(pp => {
        const associatedProductId = newAssociations[pp.productName] || null;
        if (!associatedProductId) return;

        if (!productMetrics[associatedProductId]) {
          const product = state.products.find(p => p.productId === associatedProductId);
          if (!product) return;

          productMetrics[associatedProductId] = {
            productName: product.name,
            totalInCents: 0,
            quantity: 0,
            purchases: [],
            purchaseCount: 0,
            averagePrice: 0,
            averageDaysBetweenPurchases: 0,
            variants: new Set()
          };
        }

        const metrics = productMetrics[associatedProductId];
        metrics.totalInCents += pp.totalPriceCents;
        metrics.quantity += pp.quantity;
        if (!metrics.purchases.includes(pp.purchaseId)) {
          metrics.purchases.push(pp.purchaseId);
          metrics.purchaseCount += 1;
        }
        metrics.variants.add(pp.productName);
        metrics.averagePrice = metrics.totalInCents / metrics.quantity;

        const sortedPurchases = metrics.purchases
          .map(pid => state.purchases.find(p => p.id === pid))
          .filter(Boolean)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortedPurchases.length >= 2) {
          const daysBetweenPurchases = sortedPurchases.reduce((total, purchase, index) => {
            if (index === 0) return 0;
            const daysDiff = (new Date(purchase.date) - new Date(sortedPurchases[index - 1].date)) / (1000 * 60 * 60 * 24);
            return total + daysDiff;
          }, 0);

          metrics.averageDaysBetweenPurchases = daysBetweenPurchases / (sortedPurchases.length - 1);
        }
      });

      // Converte os Sets de variantes para arrays antes de retornar
      Object.values(productMetrics).forEach(metrics => {
        metrics.variants = Array.from(metrics.variants);
      });

      return {
        ...state,
        productAssociations: newAssociations,
        productMetrics
      };
    }),

    removePurchase: (purchaseId) => update(state => {
      const purchases = state.purchases.filter(p => p.id !== purchaseId);
      const purchaseProducts = state.purchaseProducts.filter(pp => pp.purchaseId !== purchaseId);
      
      // Recalcula as métricas dos produtos
      const productMetrics = {};
      purchaseProducts.forEach(pp => {
        const associatedProductId = state.productAssociations[pp.productName] || null;
        if (!associatedProductId) return;

        if (!productMetrics[associatedProductId]) {
          const product = state.products.find(p => p.productId === associatedProductId);
          if (!product) return;

          productMetrics[associatedProductId] = {
            productName: product.name,
            totalInCents: 0,
            quantity: 0,
            purchases: [],
            purchaseCount: 0,
            averagePrice: 0,
            averageDaysBetweenPurchases: 0,
            variants: new Set()
          };
        }

        const metrics = productMetrics[associatedProductId];
        metrics.totalInCents += pp.totalPriceCents;
        metrics.quantity += pp.quantity;
        if (!metrics.purchases.includes(pp.purchaseId)) {
          metrics.purchases.push(pp.purchaseId);
          metrics.purchaseCount += 1;
        }
        metrics.variants.add(pp.productName);
        metrics.averagePrice = metrics.totalInCents / metrics.quantity;

        const sortedPurchases = metrics.purchases
          .map(pid => purchases.find(p => p.id === pid))
          .filter(Boolean)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortedPurchases.length >= 2) {
          const daysBetweenPurchases = sortedPurchases.reduce((total, purchase, index) => {
            if (index === 0) return 0;
            const daysDiff = (new Date(purchase.date) - new Date(sortedPurchases[index - 1].date)) / (1000 * 60 * 60 * 24);
            return total + daysDiff;
          }, 0);

          metrics.averageDaysBetweenPurchases = daysBetweenPurchases / (sortedPurchases.length - 1);
        }
      });

      // Converte os Sets de variantes para arrays antes de retornar
      Object.values(productMetrics).forEach(metrics => {
        metrics.variants = Array.from(metrics.variants);
      });

      return {
        ...state,
        purchases,
        purchaseProducts,
        productMetrics
      };
    }),

    saveToStorage: () => {
      update(state => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
        return state;
      });
    },

    loadFromStorage: () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          
          // Recalcula as métricas dos produtos
          const productMetrics = {};
          data.purchaseProducts.forEach(pp => {
            const associatedProductId = data.productAssociations[pp.productName] || null;
            if (!associatedProductId) return;

            if (!productMetrics[associatedProductId]) {
              const product = data.products.find(p => p.productId === associatedProductId);
              if (!product) return;

              productMetrics[associatedProductId] = {
                productName: product.name,
                totalInCents: 0,
                quantity: 0,
                purchases: [],
                purchaseCount: 0,
                averagePrice: 0,
                averageDaysBetweenPurchases: 0,
                variants: new Set()
              };
            }

            const metrics = productMetrics[associatedProductId];
            metrics.totalInCents += pp.totalPriceCents;
            metrics.quantity += pp.quantity;
            if (!metrics.purchases.includes(pp.purchaseId)) {
              metrics.purchases.push(pp.purchaseId);
              metrics.purchaseCount += 1;
            }
            metrics.variants.add(pp.productName);
            metrics.averagePrice = metrics.totalInCents / metrics.quantity;

            const sortedPurchases = metrics.purchases
              .map(pid => data.purchases.find(p => p.id === pid))
              .filter(Boolean)
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (sortedPurchases.length >= 2) {
              const daysBetweenPurchases = sortedPurchases.reduce((total, purchase, index) => {
                if (index === 0) return 0;
                const daysDiff = (new Date(purchase.date) - new Date(sortedPurchases[index - 1].date)) / (1000 * 60 * 60 * 24);
                return total + daysDiff;
              }, 0);

              metrics.averageDaysBetweenPurchases = daysBetweenPurchases / (sortedPurchases.length - 1);
            }
          });

          // Converte os Sets de variantes para arrays antes de retornar
          Object.values(productMetrics).forEach(metrics => {
            metrics.variants = Array.from(metrics.variants);
          });

          // Atualiza o store com os dados carregados e as métricas recalculadas
          set({
            ...data,
            productMetrics
          });
        }
      }
    }
  };
}

export const purchaseStore = createPurchaseStore(); 