<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let sortOrder = 'asc'; // 'asc' ou 'desc'
  let showVariants = {};
  let showEditModal = false;
  let editProductInput;
  let editingProduct = null;

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

  function toggleSort() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
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

  $: if (showEditModal && editProductInput) {
    editProductInput.value = editingProduct?.name || '';
    setTimeout(() => editProductInput.focus(), 50);
  }

  $: products = Object.entries($purchaseStore.productMetrics || {}).map(([productId, metrics]) => ({
    productId,
    name: metrics.productName,
    totalInCents: metrics.totalInCents,
    quantity: metrics.quantity,
    purchaseCount: metrics.purchaseCount,
    averagePrice: metrics.averagePrice,
    averageDaysBetweenPurchases: metrics.averageDaysBetweenPurchases,
    variants: metrics.variants
  })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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
      {#if products.length === 0}
        <div class="text-center py-12">
          <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
          <p class="mt-1 text-sm text-gray-500">
            Comece fazendo upload de notas fiscais na página inicial.
          </p>
          <div class="mt-6">
            <a
              href="/"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Fazer upload
            </a>
          </div>
        </div>
      {:else}
        <div class="mt-4">
          <div class="flex justify-end mb-4">
            <button
              on:click={toggleSort}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Ordenar {sortOrder === 'asc' ? '↓' : '↑'}
            </button>
          </div>
          <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 sm:px-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Produtos
              </h3>
            </div>
            <div class="border-t border-gray-200">
              <ul class="divide-y divide-gray-200">
                {#each products as product}
                  <li class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <div class="flex items-center">
                          <h4 class="text-lg font-medium text-gray-900">
                            {product.name}
                          </h4>
                          <button
                            on:click={() => openEditModal(product)}
                            class="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
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
                            <dt class="text-sm font-medium text-gray-500">
                              Número de compras
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
        </div>
      {/if}
    </div>
  </main>
</div>

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