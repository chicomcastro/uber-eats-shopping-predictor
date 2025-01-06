<script>
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let sortOrder = 'asc'; // 'asc' ou 'desc'
  let showVariants = {};

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

  $: products = Object.entries($purchaseStore.productMetrics)
    .map(([productId, metrics]) => ({
      productId,
      ...metrics
    }))
    .sort((a, b) => {
      const comparison = a.productName.localeCompare(b.productName, 'pt-BR');
      return sortOrder === 'asc' ? comparison : -comparison;
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
            <ul class="divide-y divide-gray-200">
              {#each products as product}
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex flex-col">
                    <div class="flex justify-between items-start">
                      <div class="flex-1">
                        <div class="flex items-center">
                          <h3 class="text-lg font-medium text-gray-900">
                            {product.productName}
                          </h3>
                          {#if product.variants?.length > 1}
                            <button
                              on:click={() => toggleVariants(product.productId)}
                              class="ml-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                              ({product.variants.length} variantes) {showVariants[product.productId] ? '▼' : '▶'}
                            </button>
                          {/if}
                        </div>
                        <p class="mt-1 text-sm text-gray-500">
                          Comprado {product.purchaseCount} {product.purchaseCount === 1 ? 'vez' : 'vezes'} • 
                          Total: {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}
                        </p>
                      </div>
                      <div class="flex flex-col text-sm text-gray-500 text-right">
                        <span>Preço médio: {formatCurrency(product.averagePrice)}</span>
                        <span>Total gasto: {formatCurrency(product.totalInCents)}</span>
                        {#if product.averageDaysBetweenPurchases > 0}
                          <span>Média de {formatNumber(product.averageDaysBetweenPurchases)} dias entre compras</span>
                        {/if}
                      </div>
                    </div>
                    {#if showVariants[product.productId] && product.variants?.length > 1}
                      <div class="mt-3 pl-4 border-l-2 border-gray-200">
                        <h4 class="text-sm font-medium text-gray-700 mb-2">Variantes:</h4>
                        <ul class="space-y-1">
                          {#each product.variants as variant}
                            <li class="text-sm text-gray-600">{variant}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
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