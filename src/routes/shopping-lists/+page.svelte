<script>
  import { shoppingListStore } from '$lib/stores/shoppingListStore';
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let newListName = '';
  let showCreateModal = false;
  let showMenus = {};
  let showSuggestions = {};
  let expandedSuggestions = {};

  function toggleMenu(listId) {
    showMenus[listId] = !showMenus[listId];
    showMenus = showMenus; // Força atualização
  }

  function closeAllMenus() {
    showMenus = {};
  }

  function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  }

  function getProductAveragePrice(productId) {
    const metrics = $purchaseStore.productMetrics;
    if (!metrics) return 0;
    
    const product = Object.entries(metrics).find(([id]) => id === productId);
    if (!product) return 0;

    return product[1].averagePrice;
  }

  function calculateListTotal(list) {
    return list.items.reduce((total, item) => {
      const averagePrice = getProductAveragePrice(item.productId);
      return total + (averagePrice * item.quantity);
    }, 0);
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

  function getSuggestedProducts(list) {
    const today = new Date();
    const metrics = $purchaseStore.productMetrics || {};
    
    return Object.entries(metrics)
      .map(([productId, metrics]) => {
        // Pula se o produto já está na lista
        if (list.items.some(item => item.productId === productId)) {
          return null;
        }

        const lastPurchaseDate = getLastPurchaseDate(metrics.purchases);
        if (!lastPurchaseDate) return null;

        const daysSinceLastPurchase = Math.floor((today - lastPurchaseDate) / (1000 * 60 * 60 * 24));
        const shouldSuggest = daysSinceLastPurchase >= metrics.averageDaysBetweenPurchases;

        if (!shouldSuggest) return null;

        return {
          productId,
          name: metrics.productName,
          daysSinceLastPurchase,
          averageDays: metrics.averageDaysBetweenPurchases,
          lastPurchaseDate,
          urgency: daysSinceLastPurchase / metrics.averageDaysBetweenPurchases
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.urgency - a.urgency);
  }

  function toggleSuggestions(listId) {
    showSuggestions[listId] = !showSuggestions[listId];
    showSuggestions = showSuggestions;
  }

  function addSuggestedProduct(list, product) {
    shoppingListStore.addItem(list.id, {
      productId: product.productId,
      name: product.name
    });
  }

  function toggleExpandSuggestions(listId) {
    expandedSuggestions[listId] = !expandedSuggestions[listId];
    expandedSuggestions = expandedSuggestions;
  }

  function formatListContent(list) {
    const lines = [
      `Lista de Compras: ${list.name}`,
      `Criada em: ${formatDate(list.createdAt)}`,
      '',
      'Itens:',
      ...list.items.map(item => `- ${item.name} (${item.quantity}x)`),
      '',
      `Total previsto: ${formatCurrency(calculateListTotal(list))}`
    ];
    return lines.join('\n');
  }

  function copyToClipboard(list) {
    const content = formatListContent(list);
    navigator.clipboard.writeText(content);
    closeAllMenus();
  }

  function shareByEmail(list) {
    const content = formatListContent(list);
    const subject = encodeURIComponent(`Lista de Compras: ${list.name}`);
    const body = encodeURIComponent(content);
    
    // Copia o conteúdo para a área de transferência
    navigator.clipboard.writeText(content);
    
    // Abre os principais serviços de webmail em uma nova aba
    const emailServices = [
      { name: 'Gmail', url: 'https://mail.google.com/mail/?view=cm&fs=1' },
      { name: 'Outlook', url: 'https://outlook.live.com/mail/0/deeplink/compose' },
      { name: 'Yahoo Mail', url: 'https://compose.mail.yahoo.com/' }
    ];

    // Cria um modal com as opções de webmail
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 500; color: #374151; margin-bottom: 8px;">Escolha um serviço de email:</h3>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px;">O conteúdo da lista foi copiado para sua área de transferência.</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${emailServices.map(service => `
            <a href="${service.url}" target="_blank" style="display: block; padding: 8px 16px; background-color: #F3F4F6; color: #374151; text-decoration: none; border-radius: 4px; font-size: 14px; text-align: center; hover:bg-gray-200;">
              Abrir ${service.name}
            </a>
          `).join('')}
        </div>
        <button onclick="this.parentElement.parentElement.remove(); document.getElementById('email-modal-overlay').remove();" style="width: 100%; margin-top: 16px; padding: 8px 16px; background-color: #E5E7EB; color: #374151; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;">
          Fechar
        </button>
      </div>
    `;

    // Adiciona o overlay
    const overlay = document.createElement('div');
    overlay.id = 'email-modal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9998';
    overlay.onclick = () => {
      overlay.remove();
      modal.remove();
    };

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    closeAllMenus();
  }

  function shareByWhatsApp(list) {
    const content = formatListContent(list);
    const text = encodeURIComponent(content);
    window.open(`https://wa.me/?text=${text}`);
    closeAllMenus();
  }

  function createGoogleCalendarEvent(list) {
    const content = formatListContent(list);
    const title = encodeURIComponent(`Lista de Compras: ${list.name}`);
    const details = encodeURIComponent(content);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Formata a data para o formato YYYYMMDD
    const date = tomorrow.toISOString().split('T')[0].replace(/-/g, '');
    
    // Cria a URL do Google Calendar com os parâmetros
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${date}/${date}`;
    
    window.open(url);
    closeAllMenus();
  }

  $: products = Object.entries($purchaseStore.productMetrics || {}).map(([productId, metrics]) => ({
    productId,
    name: metrics.productName,
    averagePrice: metrics.averagePrice
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
                      <div class="flex items-center justify-between">
                        <h4 class="text-lg font-medium text-gray-900">
                          {list.name}
                        </h4>
                        <div class="relative" style="position: static;">
                          <button
                            on:click|stopPropagation={() => toggleMenu(list.id)}
                            class="p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                          >
                            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {#if showMenus[list.id]}
                            <div class="fixed inset-0 z-10" on:click={closeAllMenus}></div>
                            <div 
                              class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"
                              style="position: fixed; right: 1rem; max-height: calc(100vh - 6rem); overflow-y: auto;"
                              on:click|stopPropagation
                            >
                              <div class="py-1" role="menu">
                                <div class="px-4 py-2 text-xs text-gray-500">
                                  Compartilhar
                                </div>
                                <button
                                  on:click={() => copyToClipboard(list)}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Copiar conteúdo
                                </button>
                                <button
                                  on:click={() => shareByWhatsApp(list)}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Enviar por WhatsApp
                                </button>
                                <button
                                  on:click={() => shareByEmail(list)}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Enviar por email
                                </button>
                                <button
                                  on:click={() => createGoogleCalendarEvent(list)}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Criar lembrete no Google Agenda
                                </button>
                                <div class="border-t border-gray-100"></div>
                                <button
                                  on:click={() => {
                                    shoppingListStore.duplicateList(list.id);
                                    closeAllMenus();
                                  }}
                                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Duplicar lista
                                </button>
                                <button
                                  on:click={() => {
                                    shoppingListStore.deleteList(list.id);
                                    closeAllMenus();
                                  }}
                                  class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  role="menuitem"
                                >
                                  Excluir lista
                                </button>
                              </div>
                            </div>
                          {/if}
                        </div>
                      </div>
                      <div class="mt-1">
                        <p class="text-sm text-gray-500">
                          Criada em: {formatDate(list.createdAt)}
                        </p>
                        <p class="text-sm text-gray-500">
                          Última atualização: {formatDate(list.updatedAt)}
                        </p>
                        <p class="text-sm font-medium text-indigo-600 mt-1">
                          Total previsto: {formatCurrency(calculateListTotal(list))}
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
                                <div class="flex-1">
                                  <span class="text-sm text-gray-900">{item.name}</span>
                                  <span class="text-sm text-gray-500 ml-2">
                                    ({formatCurrency(getProductAveragePrice(item.productId))}/un)
                                  </span>
                                </div>
                                <div class="flex items-center space-x-2">
                                  <div class="flex items-center">
                                    <button
                                      on:click={() => shoppingListStore.updateItemQuantity(list.id, item.productId, Math.max(1, item.quantity - 1))}
                                      class="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    >
                                      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                                      </svg>
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      on:change={(e) => shoppingListStore.updateItemQuantity(list.id, item.productId, parseInt(e.target.value) || 1)}
                                      class="w-14 text-sm border-gray-300 rounded-md mx-1 text-center"
                                    >
                                    <button
                                      on:click={() => shoppingListStore.updateItemQuantity(list.id, item.productId, item.quantity + 1)}
                                      class="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    >
                                      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  </div>
                                  <span class="text-sm text-gray-500 w-24 text-right">
                                    {formatCurrency(getProductAveragePrice(item.productId) * item.quantity)}
                                  </span>
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
                          on:click={() => toggleSuggestions(list.id)}
                          class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          title="Ver sugestões de produtos"
                        >
                          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                      </div>
                      {#if showSuggestions[list.id]}
                        <div class="mt-3">
                          <h5 class="text-sm font-medium text-gray-700 mb-2">Sugestões baseadas no histórico:</h5>
                          {#if getSuggestedProducts(list).length === 0}
                            <p class="text-sm text-gray-500">Nenhuma sugestão disponível no momento.</p>
                          {:else}
                            <div class="space-y-2">
                              {#each getSuggestedProducts(list).slice(0, expandedSuggestions[list.id] ? undefined : 10) as product}
                                <div class="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                  <div class="flex-1">
                                    <p class="text-sm font-medium text-gray-900">{product.name}</p>
                                    <p class="text-xs text-gray-500">
                                      Última compra: {formatDate(product.lastPurchaseDate)}
                                      <span class="mx-1">•</span>
                                      Média: {product.averageDays.toFixed(1)} dias
                                    </p>
                                  </div>
                                  <button
                                    on:click={() => addSuggestedProduct(list, product)}
                                    class="ml-4 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              {/each}
                              {#if getSuggestedProducts(list).length > 10}
                                <button
                                  on:click={() => toggleExpandSuggestions(list.id)}
                                  class="mt-2 w-full text-center text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                  {expandedSuggestions[list.id] ? 'Ver menos sugestões' : `Ver mais ${getSuggestedProducts(list).length - 10} sugestões`}
                                </button>
                              {/if}
                            </div>
                          {/if}
                        </div>
                      {/if}
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