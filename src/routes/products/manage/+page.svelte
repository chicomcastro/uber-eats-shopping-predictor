<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { onMount } from 'svelte';

  let newProductName = '';
  let searchTerm = '';
  let selectedProduct = null;
  let showAddModal = false;
  let showEditModal = false;
  let addProductInput;
  let editProductInput;
  let editingProduct = null;
  let showOnlyUnassociated = false;

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

  function handleAssociateProduct(purchaseProductName, productId) {
    purchaseStore.associateProduct(purchaseProductName, productId);
    purchaseStore.saveToStorage();
  }

  function handleRemoveAssociation(purchaseProductName) {
    purchaseStore.removeAssociation(purchaseProductName);
    purchaseStore.saveToStorage();
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      if (showAddModal) {
        handleAddProduct();
      } else if (showEditModal) {
        handleEditProduct();
      }
    }
  }

  function getSimilarityScore(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Remove caracteres especiais e espaços extras
    const clean1 = s1.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const clean2 = s2.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    
    // Se uma string contém a outra, alta similaridade
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return 0.8;
    }
    
    // Divide em palavras e verifica palavras em comum
    const words1 = new Set(clean1.split(' '));
    const words2 = new Set(clean2.split(' '));
    const commonWords = [...words1].filter(word => words2.has(word));
    
    if (commonWords.length > 0) {
      return 0.5 * (commonWords.length / Math.max(words1.size, words2.size));
    }
    
    return 0;
  }

  function getSuggestions(purchaseProductName) {
    const suggestions = products
      .map(product => ({
        ...product,
        similarity: getSimilarityScore(purchaseProductName, product.name)
      }))
      .filter(product => product.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    return suggestions;
  }

  $: filteredPurchaseProducts = $purchaseStore.purchaseProducts
    .filter((pp, index, self) => 
      // Garante que o produto tem um nome
      pp?.productName &&
      // Remove duplicatas
      index === self.findIndex(p => p.productName === pp.productName) &&
      // Aplica o filtro de busca
      pp.productName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      // Aplica o filtro de não associados
      (!showOnlyUnassociated || !productAssociations?.[pp.productName])
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

  $: if (showAddModal && addProductInput) {
    // Foca o input quando o modal é aberto
    setTimeout(() => addProductInput.focus(), 50);
  }

  $: if (showEditModal && editProductInput) {
    editProductInput.value = editingProduct?.name || '';
    setTimeout(() => editProductInput.focus(), 50);
  }

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
  <main class="relative">
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
          <div class="ml-4">
            <button
              on:click={() => showOnlyUnassociated = !showOnlyUnassociated}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md {showOnlyUnassociated ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {showOnlyUnassociated ? 'Mostrar todos' : 'Mostrar sem associação'}
            </button>
          </div>
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
                          <button
                            on:click={() => openEditModal(associatedProduct)}
                            class="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            Editar produto
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
                    <div class="ml-4 flex flex-col gap-2">
                      {#if getSuggestions(purchaseProduct.productName).length > 0}
                        <div class="flex flex-wrap gap-2">
                          {#each getSuggestions(purchaseProduct.productName) as suggestion}
                            <button
                              on:click={() => handleAssociateProduct(purchaseProduct.productName, suggestion.productId)}
                              class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              {suggestion.name}
                            </button>
                          {/each}
                        </div>
                      {/if}
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

    <!-- Botão fixo -->
    <div class="fixed bottom-0 right-0 p-6">
      <button
        on:click={() => showAddModal = true}
        class="inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg class="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Adicionar Produto
      </button>
    </div>
  </main>
</div>

{#if showAddModal}
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
                Adicionar Produto
              </h3>
              <div class="mt-2">
                <input
                  bind:this={addProductInput}
                  bind:value={newProductName}
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
            on:click={handleAddProduct}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Adicionar
          </button>
          <button
            type="button"
            on:click={() => showAddModal = false}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
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