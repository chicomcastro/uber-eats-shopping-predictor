<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { onMount } from 'svelte';

  let newProductName = '';
  let searchTerm = '';
  let selectedProduct = null;
  let showAddModal = false;

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  }

  function handleAddProduct() {
    if (newProductName.trim()) {
      purchaseStore.addProduct(newProductName.trim());
      purchaseStore.saveToStorage();
      newProductName = '';
      showAddModal = false;
    }
  }

  function handleAssociateProduct(purchaseProductName, productId) {
    purchaseStore.associateProduct(purchaseProductName, productId);
    purchaseStore.saveToStorage();
  }

  function handleRemoveAssociation(purchaseProductName) {
    purchaseStore.removeAssociation(purchaseProductName);
    purchaseStore.saveToStorage();
  }

  $: filteredPurchaseProducts = $purchaseStore.purchaseProducts
    .filter((pp, index, self) => 
      // Garante que o produto tem um nome
      pp?.productName &&
      // Remove duplicatas
      index === self.findIndex(p => p.productName === pp.productName) &&
      // Aplica o filtro de busca
      pp.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Garante que ambos os produtos têm nomes válidos
      const nameA = a?.productName || '';
      const nameB = b?.productName || '';
      return nameA.localeCompare(nameB, 'pt-BR');
    });

  $: products = ($purchaseStore.products || [])
    .filter(p => p?.name) // Garante que o produto tem um nome
    .sort((a, b) => {
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB, 'pt-BR');
    });

  $: productAssociations = $purchaseStore.productAssociations || {};

  // Inicializa o store se necessário
  onMount(() => {
    if (!$purchaseStore.productAssociations) {
      purchaseStore.setProductAssociations({});
    }
  });
</script>

<div class="py-10">
  <header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold leading-tight text-gray-900">
        Gerenciar Produtos
      </h1>
    </div>
  </header>
  <main>
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      <div class="mt-4">
        <div class="flex justify-between items-center mb-4">
          <div class="flex-1 max-w-lg">
            <label for="search" class="sr-only">Buscar produtos</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
              </div>
              <input
                bind:value={searchTerm}
                type="search"
                name="search"
                id="search"
                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Buscar produtos..."
              >
            </div>
          </div>
          <button
            on:click={() => showAddModal = true}
            class="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Adicionar Produto
          </button>
        </div>

        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul class="divide-y divide-gray-200">
            {#each filteredPurchaseProducts as purchaseProduct}
              <li class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-lg font-medium text-gray-900">
                      {purchaseProduct.productName}
                    </h3>
                    {#if productAssociations && productAssociations[purchaseProduct.productName]}
                      {@const associatedProduct = products.find(p => p?.productId === productAssociations[purchaseProduct.productName])}
                      {#if associatedProduct}
                        <p class="mt-1 text-sm text-gray-500">
                          Associado a: {associatedProduct.name}
                          <button
                            on:click={() => handleRemoveAssociation(purchaseProduct.productName)}
                            class="ml-2 text-red-600 hover:text-red-800"
                          >
                            Remover associação
                          </button>
                        </p>
                      {/if}
                    {:else}
                      <p class="mt-1 text-sm text-gray-500">
                        Não associado
                      </p>
                    {/if}
                  </div>
                  {#if !productAssociations?.[purchaseProduct.productName]}
                    <div class="ml-4">
                      <select
                        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        on:change={(e) => handleAssociateProduct(purchaseProduct.productName, e.target.value)}
                      >
                        <option value="">Selecione um produto...</option>
                        {#each products as product}
                          <option value={product.productId}>
                            {product.name}
                          </option>
                        {/each}
                      </select>
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </main>
</div>

{#if showAddModal}
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div>
          <div class="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              Adicionar Novo Produto
            </h3>
            <div class="mt-2">
              <input
                type="text"
                bind:value={newProductName}
                placeholder="Nome do produto"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={handleAddProduct}
          >
            Adicionar
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            on:click={() => showAddModal = false}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 