<script>
  import { page } from '$app/stores';
  import { purchaseStore } from '$lib/stores/purchaseStore';

  $: purchase = $purchaseStore.purchases.find(p => p.id === $page.params.id);
</script>

{#if purchase}
  <div class="py-10">
    <header>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="md:flex md:items-center md:justify-between">
          <div class="flex-1 min-w-0">
            <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Compra do dia {new Date(purchase.date).toLocaleDateString('pt-BR')}
            </h2>
          </div>
          <div class="mt-4 flex md:mt-0 md:ml-4">
            <a
              href="/purchases"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Voltar
            </a>
          </div>
        </div>
      </div>
    </header>
    <main>
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white shadow overflow-hidden sm:rounded-lg mt-8">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Detalhes da Compra
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              Total: R$ {purchase.total.toFixed(2)}
            </p>
          </div>
          <div class="border-t border-gray-200">
            <dl>
              <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">
                  Data
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(purchase.date).toLocaleDateString('pt-BR')}
                </dd>
              </div>
              <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">
                  Quantidade de Itens
                </dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {purchase.products.length}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="mt-8">
          <div class="md:flex md:items-center md:justify-between">
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Produtos
              </h2>
            </div>
          </div>
          <div class="mt-4 flex flex-col">
            <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produto
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantidade
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço Unitário
                        </th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each purchase.products as product}
                        <tr class:bg-red-50={product.outOfStock}>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                              <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">
                                  {product.name}
                                  {#if product.substituted}
                                    <span class="text-xs text-yellow-600 ml-2">
                                      Substituído por: {product.substituted}
                                    </span>
                                  {/if}
                                  {#if product.outOfStock}
                                    <span class="text-xs text-red-600 ml-2">
                                      Esgotado
                                    </span>
                                  {/if}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">
                              {product.quantity}
                              {#if product.weight}
                                <span class="text-gray-500">
                                  ({product.weight}kg)
                                </span>
                              {/if}
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-900">
                              {#if product.unitPrice}
                                R$ {product.unitPrice.toFixed(2)}
                              {:else if product.pricePerKg}
                                R$ {product.pricePerKg.toFixed(2)}/kg
                              {:else}
                                -
                              {/if}
                            </div>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            R$ {product.totalPrice.toFixed(2)}
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
      </div>
    </main>
  </div>
{:else}
  <div class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900">
          Compra não encontrada
        </h2>
        <p class="mt-2 text-sm text-gray-500">
          A compra que você está procurando não existe ou foi removida.
        </p>
        <div class="mt-6">
          <a
            href="/purchases"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Voltar para lista de compras
          </a>
        </div>
      </div>
    </div>
  </div>
{/if} 