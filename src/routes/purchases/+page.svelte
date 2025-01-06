<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import moment from 'moment';

  let showDeleteModal = false;
  let purchaseToDelete = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function handleDelete(purchase) {
    purchaseToDelete = purchase;
    showDeleteModal = true;
  }

  function confirmDelete() {
    if (purchaseToDelete) {
      purchaseStore.removePurchase(purchaseToDelete.id);
      purchaseStore.saveToStorage();
      showDeleteModal = false;
      purchaseToDelete = null;
    }
  }

  function cancelDelete() {
    showDeleteModal = false;
    purchaseToDelete = null;
  }
</script>

<div class="py-10">
  <header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold leading-tight text-gray-900">
        Compras
      </h1>
    </div>
  </header>
  <main>
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      {#if $purchaseStore.purchases.length === 0}
        <div class="text-center py-12">
          <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma compra encontrada</h3>
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
        <div class="bg-white shadow overflow-hidden sm:rounded-md mt-4">
          <ul class="divide-y divide-gray-200">
            {#each $purchaseStore.purchases.sort((a, b) => moment(b.date).diff(moment(a.date))) as purchase}
              <li>
                <div class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex flex-col">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {moment(purchase.date).format('DD/MM/YYYY')}
                      </p>
                      <p class="mt-2 flex items-center text-sm text-gray-500">
                        <span>{purchase.products.length} itens</span>
                        <span class="mx-2">•</span>
                        <span>{formatCurrency(purchase.total)}</span>
                      </p>
                    </div>
                    <div class="flex space-x-2">
                      <a
                        href="/purchases/{purchase.id}"
                        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Ver detalhes
                      </a>
                      <button
                        on:click={() => handleDelete(purchase)}
                        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </main>
</div>

{#if showDeleteModal}
  <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
        <div class="sm:flex sm:items-start">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              Confirmar exclusão
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.
                {#if purchaseToDelete}
                  <br><br>
                  Data: {moment(purchaseToDelete.date).format('DD/MM/YYYY')}<br>
                  Valor: {formatCurrency(purchaseToDelete.total)}<br>
                  Itens: {purchaseToDelete.products.length}
                {/if}
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            on:click={confirmDelete}
          >
            Excluir
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            on:click={cancelDelete}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 