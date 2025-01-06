import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'shopping-lists';

function createShoppingListStore() {
    const initialLists = browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') : [];
    const { subscribe, set, update } = writable(initialLists);

    return {
        subscribe,
        addList: (name) => {
            update(lists => {
                const newList = {
                    id: crypto.randomUUID(),
                    name,
                    items: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                return [...lists, newList];
            });
            saveToStorage();
        },
        addItem: (listId, product) => {
            update(lists => {
                const list = lists.find(l => l.id === listId);
                if (list) {
                    const existingItem = list.items.find(item => item.productId === product.productId);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        list.items.push({
                            productId: product.productId,
                            name: product.name,
                            quantity: 1
                        });
                    }
                    list.updatedAt = new Date().toISOString();
                }
                return [...lists];
            });
            saveToStorage();
        },
        removeItem: (listId, productId) => {
            update(lists => {
                const list = lists.find(l => l.id === listId);
                if (list) {
                    list.items = list.items.filter(item => item.productId !== productId);
                    list.updatedAt = new Date().toISOString();
                }
                return [...lists];
            });
            saveToStorage();
        },
        updateItemQuantity: (listId, productId, quantity) => {
            update(lists => {
                const list = lists.find(l => l.id === listId);
                if (list) {
                    const item = list.items.find(item => item.productId === productId);
                    if (item) {
                        item.quantity = quantity;
                        list.updatedAt = new Date().toISOString();
                    }
                }
                return [...lists];
            });
            saveToStorage();
        },
        deleteList: (listId) => {
            update(lists => lists.filter(l => l.id !== listId));
            saveToStorage();
        }
    };

    function saveToStorage() {
        if (browser) {
            const unsubscribe = subscribe(currentLists => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLists));
            });
            unsubscribe();
        }
    }
}

export const shoppingListStore = createShoppingListStore(); 