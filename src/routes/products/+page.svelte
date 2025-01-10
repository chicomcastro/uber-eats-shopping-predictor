<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { shoppingListStore } from '$lib/stores/shoppingListStore';
  import { base } from '$app/paths';
  import moment from 'moment';
  moment.locale('pt-br');

  let sortOrder = 'asc'; // 'asc' ou 'desc'
  let sortField = 'name'; // campo atual de ordenação
  let showVariants = {};
  let showEditModal = false;
  let editProductInput;
  let editingProduct = null;
  let showOnlyUnassociated = false;
  let showSortOptions = false;
  let showSnackbar = false;
  let snackbarProduct = null;
  let snackbarTimeout;
  let showPurchaseHistory = {};
  let selectedProduct = null;

  const sortOptions = [
    { id: 'name', label: 'Nome' },
    { id: 'averagePrice', label: 'Preço médio' },
    { id: 'purchaseCount', label: 'Número de compras' },
    { id: 'lastPurchaseDate', label: 'Data da última compra' }
  ];

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatDate(date) {
    return moment(date).format('DD [de] MMMM [de] YYYY');
  }

  function toggleSort() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
  }

  function setSortField(field) {
    if (sortField === field) {
      toggleSort();
    } else {
      sortField = field;
      sortOrder = 'asc';
    }
    showSortOptions = false;
  }

  function getSortIcon(field) {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? '↑' : '↓';
  }

  function toggleVariants(productId) {
    showVariants[productId] = !showVariants[productId];
    showVariants = showVariants; // Força atualização
  }

  function handleEditProduct() {
    if (editingProduct && editProductInput.value.trim()) {
      purchaseStore.updateProductName(editingProduct.productId, editProductInput.value.trim());
      purchaseStore.saveToStorage();
      showEditModal = false;
      editingProduct = null;
    }
  }

  function openEditModal(product) {
    editingProduct = product;
    showEditModal = true;
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && showEditModal) {
      handleEditProduct();
    }
  }

  function getLastPurchaseDate(purchaseIds) {
    let lastDate = null;

    const purchases = Object.values($purchaseStore.purchases || {});

    for (const purchase of purchases) {
      if (purchaseIds.includes(purchase.id)) {
        const purchaseDate = new Date(purchase.date);
        if (!lastDate || purchaseDate > lastDate) {
          lastDate = purchaseDate;
        }
      }
    }

    return lastDate;
  }

  function getLatestShoppingList() {
    if ($shoppingListStore.length === 0) return null;
    return $shoppingListStore[$shoppingListStore.length - 1];
  }

  function showAddedToListSnackbar(product) {
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    snackbarProduct = product;
    showSnackbar = true;
    snackbarTimeout = setTimeout(() => {
      showSnackbar = false;
      snackbarProduct = null;
    }, 5000);
  }

  function addToLatestList(product) {
    const latestList = getLatestShoppingList();
    if (latestList) {
      shoppingListStore.addItem(latestList.id, {
        productId: product.productId,
        name: product.name
      });
      showAddedToListSnackbar(product);
    }
  }

  function togglePurchaseHistory(product) {
    showPurchaseHistory[product.productId] = !showPurchaseHistory[product.productId];
    showPurchaseHistory = showPurchaseHistory;
    selectedProduct = product;
  }

  function getPurchaseHistory(product) {
    const purchases = Object.values($purchaseStore.purchases || {})
      .filter(purchase => product.variants.some(variant => 
        $purchaseStore.purchaseProducts.some(pp => 
          pp.purchaseId === purchase.id && 
          pp.productName === variant
        )
      ))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return purchases.map(purchase => {
      const purchaseProduct = $purchaseStore.purchaseProducts.find(pp => 
        pp.purchaseId === purchase.id && 
        product.variants.includes(pp.productName)
      );

      return {
        date: purchase.date,
        quantity: purchaseProduct.quantity,
        totalPrice: purchaseProduct.totalPriceCents,
        variant: purchaseProduct.productName
      };
    });
  }

  $: if (showEditModal && editProductInput) {
    editProductInput.value = editingProduct?.name || '';
    setTimeout(() => editProductInput.focus(), 50);
  }

  $: products = Object.entries($purchaseStore.productMetrics || {})
    .map(([productId, metrics]) => {
      const variants = metrics.variants || [];
      const hasAssociation = variants.some(variant => 
        $purchaseStore.productAssociations && $purchaseStore.productAssociations[variant]
      );
      const isFavorite = $shoppingListStore.favorites.includes(productId);

      return {
        productId,
        name: metrics.productName,
        totalInCents: metrics.totalInCents,
        quantity: metrics.quantity,
        purchaseCount: metrics.purchaseCount,
        averagePrice: metrics.averagePrice,
        averageDaysBetweenPurchases: metrics.averageDaysBetweenPurchases,
        variants,
        lastPurchaseDate: getLastPurchaseDate(metrics.purchases),
        hasAssociation,
        isFavorite
      };
    })
    .filter(product => !showOnlyUnassociated || !product.hasAssociation)
    .sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      
      switch (sortField) {
        case 'name':
          return direction * a.name.localeCompare(b.name, 'pt-BR');
        case 'averagePrice':
          return direction * (a.averagePrice - b.averagePrice);
        case 'purchaseCount':
          return direction * (a.purchaseCount - b.purchaseCount);
        case 'lastPurchaseDate':
          const dateA = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
          const dateB = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
          return direction * (dateA - dateB);
        default:
          return 0;
      }
    });
</script>

<div class="py-10">
  <header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <h1 class="text-3xl font-bold leading-tight text-gray-900">
        Produtos
      </h1>
      <a
        href="/products/manage"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Gerenciar Produtos
      </a>
    </div>
  </header>
  <main>
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      <div class="mt-4">
        <div class="flex justify-end mb-4 space-x-4">
          <button
            on:click={() => showOnlyUnassociated = !showOnlyUnassociated}
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md {showOnlyUnassociated ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {showOnlyUnassociated ? 'Mostrar todos' : 'Mostrar sem associação'}
          </button>
          <div class="relative">
            <button
              on:click={() => showSortOptions = !showSortOptions}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Ordenar por {sortOptions.find(opt => opt.id === sortField).label} {getSortIcon(sortField)}
            </button>
            {#if showSortOptions}
              <div 
                class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                on:mouseleave={() => showSortOptions = false}
              >
                <div class="py-1" role="menu" aria-orientation="vertical">
                  {#each sortOptions as option}
                    <button
                      on:click={() => setSortField(option.id)}
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      role="menuitem"
                    >
                      {option.label} {getSortIcon(option.id)}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        {#if products.length === 0}
          <div class="text-center py-12">
            <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
            <p class="mt-1 text-sm text-gray-500">
              {#if showOnlyUnassociated}
                Não há produtos sem associação.
              {:else}
                Comece fazendo upload de notas fiscais na página inicial.
              {/if}
            </p>
            {#if !showOnlyUnassociated}
              <div class="mt-6">
                <a
                  href="{base}/"
                  class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Fazer upload
                </a>
              </div>
            {/if}
          </div>
        {:else}
          <div class="bg-white shadow overflow-hidden sm:rounded-lg mt-4">
            <div class="px-4 py-5 sm:px-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Produtos
              </h3>
            </div>
            <div class="border-t border-gray-200">
              <ul class="divide-y divide-gray-200">
                {#each products as product}
                  <li class="px-4 py-4 sm:px-6">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center">
                            <h4 class="text-lg font-medium text-gray-900">
                              {product.name}
                            </h4>
                            <button
                              on:click={() => shoppingListStore.toggleFavorite(product.productId)}
                              class="ml-2 p-1 text-gray-400 hover:text-yellow-500 focus:outline-none"
                              title={product.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            >
                              <svg
                                class={`h-5 w-5 ${product.isFavorite ? 'text-yellow-500' : ''}`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill={product.isFavorite ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                />
                              </svg>
                            </button>
                            <button
                              on:click={() => openEditModal(product)}
                              class="ml-2 text-indigo-600 hover:text-indigo-800"
                            >
                              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                          {#if getLatestShoppingList()}
                            <button
                              on:click={() => addToLatestList(product)}
                              class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              title="Adicionar à última lista de compras"
                            >
                              <svg class="h-5 w-5 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Adicionar à lista
                            </button>
                          {/if}
                        </div>
                        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div>
                            <dt class="text-sm font-medium text-gray-500">
                              Total gasto
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {formatCurrency(product.totalInCents)}
                            </dd>
                          </div>
                          <div>
                            <dt class="text-sm font-medium text-gray-500">
                              Quantidade total
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {product.quantity}
                            </dd>
                          </div>
                          <div>
                            <dt class="text-sm font-medium text-gray-500 flex items-center">
                              Número de compras
                              <button
                                on:click={() => togglePurchaseHistory(product)}
                                class="ml-1 text-indigo-600 hover:text-indigo-800"
                                title="Ver histórico de compras"
                              >
                                <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {product.purchaseCount}
                            </dd>
                          </div>
                          <div>
                            <dt class="text-sm font-medium text-gray-500">
                              Preço médio
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {formatCurrency(product.averagePrice)}
                            </dd>
                          </div>
                          <div>
                            <dt class="text-sm font-medium text-gray-500">
                              Média de dias entre compras
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {product.averageDaysBetweenPurchases.toFixed(1)} dias
                            </dd>
                          </div>
                          <div>
                            <dt class="text-sm font-medium text-gray-500">
                              Última compra
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {product.lastPurchaseDate ? formatDate(product.lastPurchaseDate) : 'Nunca'}
                            </dd>
                          </div>
                          <div class="sm:col-span-3">
                            <dt class="text-sm font-medium text-gray-500">
                              Variantes
                            </dt>
                            <dd class="mt-1 text-sm text-gray-900">
                              {product.variants.join(', ')}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>

{#if showSnackbar && snackbarProduct}
  <div class="fixed bottom-4 right-4 z-50">
    <div class="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
      <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <div>
        <p class="font-medium">{snackbarProduct.name} adicionado à lista</p>
        <a
          href="{base}/shopping-lists"
          class="text-sm text-indigo-300 hover:text-indigo-200"
        >
          Ver listas de compras
        </a>
      </div>
      <button
        on:click={() => { showSnackbar = false; snackbarProduct = null; }}
        class="ml-4 text-gray-400 hover:text-gray-300"
      >
        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="fixed z-10 inset-0 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Editar Produto
              </h3>
              <div class="mt-2">
                <input
                  bind:this={editProductInput}
                  on:keypress={handleKeyPress}
                  type="text"
                  class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Nome do produto"
                >
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={handleEditProduct}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Salvar
          </button>
          <button
            type="button"
            on:click={() => { showEditModal = false; editingProduct = null; }}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if selectedProduct && showPurchaseHistory[selectedProduct.productId]}
  <div class="fixed z-10 inset-0 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Histórico de Compras - {selectedProduct.name}
              </h3>
              <div class="mt-2">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variante
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Total
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each getPurchaseHistory(selectedProduct) as purchase}
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(purchase.date)}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.variant}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {purchase.quantity}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(purchase.totalPrice)}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={() => { showPurchaseHistory[selectedProduct.productId] = false; selectedProduct = null; }}
            class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 