<script>
  import { shoppingListStore } from '$lib/stores/shoppingListStore';
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let newListName = '';
  let showCreateModal = false;

  function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function handleCreateList() {
    if (newListName.trim()) {
      shoppingListStore.addList(newListName.trim());
      newListName = '';
      showCreateModal = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && showCreateModal) {
      handleCreateList();
    }
  }

  $: products = Object.entries($purchaseStore.productMetrics || {}).map(([productId, metrics]) => ({
    productId,
    name: metrics.productName
  })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
</script>

<div class="py-10">
  <header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <h1 class="text-3xl font-bold leading-tight text-gray-900">
        Listas de Compras
      </h1>
      <button
        on:click={() => showCreateModal = true}
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Nova Lista
      </button>
    </div>
  </header>
  <main>
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      {#if $shoppingListStore.length === 0}
        <div class="text-center py-12">
          <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma lista encontrada</h3>
          <p class="mt-1 text-sm text-gray-500">
            Comece criando uma nova lista de compras.
          </p>
          <div class="mt-6">
            <button
              on:click={() => showCreateModal = true}
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Criar Lista
            </button>
          </div>
        </div>
      {:else}
        <div class="mt-4">
          <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul class="divide-y divide-gray-200">
              {#each $shoppingListStore as list}
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h4 class="text-lg font-medium text-gray-900">
                        {list.name}
                      </h4>
                      <div class="mt-1">
                        <p class="text-sm text-gray-500">
                          Criada em: {formatDate(list.createdAt)}
                        </p>
                        <p class="text-sm text-gray-500">
                          Última atualização: {formatDate(list.updatedAt)}
                        </p>
                      </div>
                      <div class="mt-3">
                        <h5 class="text-sm font-medium text-gray-700">Itens:</h5>
                        {#if list.items.length === 0}
                          <p class="text-sm text-gray-500 mt-1">Nenhum item adicionado</p>
                        {:else}
                          <ul class="mt-2 space-y-2">
                            {#each list.items as item}
                              <li class="flex items-center justify-between">
                                <span class="text-sm text-gray-900">{item.name}</span>
                                <div class="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    on:change={(e) => shoppingListStore.updateItemQuantity(list.id, item.productId, parseInt(e.target.value))}
                                    class="w-16 text-sm border-gray-300 rounded-md"
                                  >
                                  <button
                                    on:click={() => shoppingListStore.removeItem(list.id, item.productId)}
                                    class="text-red-600 hover:text-red-800"
                                  >
                                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </li>
                            {/each}
                          </ul>
                        {/if}
                      </div>
                      <div class="mt-3 flex items-center space-x-2">
                        <select
                          class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          on:change={(e) => {
                            const product = products.find(p => p.productId === e.target.value);
                            if (product) {
                              shoppingListStore.addItem(list.id, product);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Adicionar produto...</option>
                          {#each products as product}
                            <option value={product.productId}>{product.name}</option>
                          {/each}
                        </select>
                        <button
                          on:click={() => shoppingListStore.deleteList(list.id)}
                          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                          Excluir Lista
                        </button>
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
  </main>
</div>

{#if showCreateModal}
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
                Nova Lista de Compras
              </h3>
              <div class="mt-2">
                <input
                  bind:value={newListName}
                  on:keypress={handleKeyPress}
                  type="text"
                  class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Nome da lista"
                >
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            on:click={handleCreateList}
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Criar
          </button>
          <button
            type="button"
            on:click={() => { showCreateModal = false; newListName = ''; }}
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 