import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'shopping-lists';

function createShoppingListStore() {
    const initialLists = browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') : [];
    const initialFavorites = browser ? JSON.parse(localStorage.getItem(STORAGE_KEY + '_favorites') || '[]') : [];
    const { subscribe, set, update } = writable({
        lists: initialLists,
        favorites: initialFavorites
    });

    return {
        subscribe,
        addList: (name) => {
            update(state => {
                const newList = {
                    id: crypto.randomUUID(),
                    name,
                    items: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                return { ...state, lists: [...state.lists, newList] };
            });
            saveToStorage();
        },
        addItem: (listId, product) => {
            update(state => {
                const list = state.lists.find(l => l.id === listId);
                if (list) {
                    const existingItem = list.items.find(item => item.productId === product.productId);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        list.items.push({
                            productId: product.productId,
                            name: product.name,
                            quantity: 1,
                            checked: false
                        });
                    }
                    list.updatedAt = new Date().toISOString();
                }
                return { ...state, lists: [...state.lists] };
            });
            saveToStorage();
        },
        removeItem: (listId, productId) => {
            update(state => {
                const list = state.lists.find(l => l.id === listId);
                if (list) {
                    list.items = list.items.filter(item => item.productId !== productId);
                    list.updatedAt = new Date().toISOString();
                }
                return { ...state, lists: [...state.lists] };
            });
            saveToStorage();
        },
        updateItemQuantity: (listId, productId, quantity) => {
            update(state => {
                const list = state.lists.find(l => l.id === listId);
                if (list) {
                    const item = list.items.find(item => item.productId === productId);
                    if (item) {
                        item.quantity = quantity;
                        list.updatedAt = new Date().toISOString();
                    }
                }
                return { ...state, lists: [...state.lists] };
            });
            saveToStorage();
        },
        deleteList: (listId) => {
            update(state => ({
                ...state,
                lists: state.lists.filter(l => l.id !== listId)
            }));
            saveToStorage();
        },
        duplicateList: (listId) => {
            update(state => {
                const originalList = state.lists.find(l => l.id === listId);
                if (originalList) {
                    const newList = {
                        id: crypto.randomUUID(),
                        name: `${originalList.name} (cópia)`,
                        items: originalList.items.map(item => ({
                            productId: item.productId,
                            name: item.name,
                            quantity: item.quantity,
                            checked: false
                        })),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    return { ...state, lists: [...state.lists, newList] };
                }
                return state;
            });
            saveToStorage();
        },
        toggleItemChecked: (listId, productId) => {
            update(state => {
                const list = state.lists.find(l => l.id === listId);
                if (list) {
                    const item = list.items.find(item => item.productId === productId);
                    if (item) {
                        item.checked = !item.checked;
                        list.updatedAt = new Date().toISOString();
                    }
                }
                return { ...state, lists: [...state.lists] };
            });
            saveToStorage();
        },
        toggleFavorite: (productId) => {
            update(state => {
                const favorites = state.favorites || [];
                const index = favorites.indexOf(productId);
                
                if (index === -1) {
                    return { ...state, favorites: [...favorites, productId] };
                } else {
                    return { ...state, favorites: favorites.filter(id => id !== productId) };
                }
            });
            saveToStorage();
        },
        updateListName: (listId, newName) => {
            update(state => {
                const list = state.lists.find(l => l.id === listId);
                if (list) {
                    list.name = newName;
                    list.updatedAt = new Date().toISOString();
                }
                return { ...state, lists: [...state.lists] };
            });
            saveToStorage();
        }
    };

    function saveToStorage() {
        if (browser) {
            const unsubscribe = subscribe(state => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lists));
                localStorage.setItem(STORAGE_KEY + '_favorites', JSON.stringify(state.favorites));
            });
            unsubscribe();
        }
    }
}

export const shoppingListStore = createShoppingListStore(); 