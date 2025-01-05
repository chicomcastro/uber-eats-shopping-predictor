import { writable } from 'svelte/store';

function createPurchaseStore() {
  const { subscribe, set, update } = writable({
    purchases: [],
    products: [],
    purchaseProducts: [],
    productMetrics: {}
  });

  return {
    subscribe,
    setPurchases: (purchases) => update(state => ({ ...state, purchases })),
    setProducts: (products) => update(state => ({ ...state, products })),
    setPurchaseProducts: (purchaseProducts) => update(state => ({ ...state, purchaseProducts })),
    setProductMetrics: (productMetrics) => update(state => ({ ...state, productMetrics })),
    
    // Carregar dados do localStorage
    loadFromStorage: () => {
      const data = localStorage.getItem('purchaseData');
      if (data) {
        set(JSON.parse(data));
      }
    },

    // Salvar dados no localStorage
    saveToStorage: () => {
      update(state => {
        localStorage.setItem('purchaseData', JSON.stringify(state));
        return state;
      });
    }
  };
}

export const purchaseStore = createPurchaseStore(); 