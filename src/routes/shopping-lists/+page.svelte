<script>
  import { shoppingListStore } from '$lib/stores/shoppingListStore';
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let newListName = '';
  let showCreateModal = false;
  let showMenus = {};
  let showSuggestions = {};
  let expandedSuggestions = {};
  let editingListId = null;
  let editingListName = '';

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

        const isFavorite = $shoppingListStore.favorites.includes(productId);
        const lastPurchaseDate = getLastPurchaseDate(metrics.purchases);

        // Se for favorito e não estiver na lista, sempre sugere
        if (isFavorite) {
          return {
            productId,
            name: metrics.productName,
            daysSinceLastPurchase: lastPurchaseDate ? Math.floor((today - lastPurchaseDate) / (1000 * 60 * 60 * 24)) : 0,
            averageDays: metrics.averageDaysBetweenPurchases || 0,
            lastPurchaseDate,
            urgency: 999, // Alta prioridade para favoritos
            isFavorite
          };
        }

        // Pula se não tem média de dias entre compras (dados insuficientes)
        if (!metrics.averageDaysBetweenPurchases) {
          return null;
        }

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
          urgency: daysSinceLastPurchase / metrics.averageDaysBetweenPurchases,
          isFavorite
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Primeiro ordena por favorito
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        // Depois por urgência
        return b.urgency - a.urgency;
      });
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

  function handleEditListName() {
    if (editingListId && editingListName.trim()) {
      shoppingListStore.updateListName(editingListId, editingListName.trim());
      editingListId = null;
      editingListName = '';
    }
  }

  function startEditingListName(list) {
    editingListId = list.id;
    editingListName = list.name;
    closeAllMenus();
  }

  function handleEditListNameKeyPress(event) {
    if (event.key === 'Enter') {
      handleEditListName();
    } else if (event.key === 'Escape') {
      editingListId = null;
      editingListName = '';
    }
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
      {#if $shoppingListStore.lists.length === 0}
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
              {#each $shoppingListStore.lists.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) as list}
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex flex-col space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0">
                        {#if editingListId === list.id}
                          <div class="flex items-center space-x-2">
                            <input
                              type="text"
                              bind:value={editingListName}
                              on:keydown={handleEditListNameKeyPress}
                              class="block w-full sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Nome da lista"
                            >
                            <button
                              on:click={handleEditListName}
                              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Salvar
                            </button>
                            <button
                              on:click={() => { editingListId = null; editingListName = ''; }}
                              class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Cancelar
                            </button>
                          </div>
                        {:else}
                          <h2 class="text-xl font-medium text-gray-900 truncate">
                            {list.name}
                          </h2>
                        {/if}
                      </div>
                      <div class="relative">
                        <button
                          on:click={() => toggleMenu(list.id)}
                          class="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                        >
                          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {#if showMenus[list.id]}
                          <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div class="py-1">
                              <button
                                on:click={() => startEditingListName(list)}
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Editar nome
                              </button>
                              <button
                                on:click={() => copyToClipboard(list)}
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Copiar
                              </button>
                              <button
                                on:click={() => shareByEmail(list)}
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Enviar por email
                              </button>
                              <button
                                on:click={() => shareByWhatsApp(list)}
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Enviar por WhatsApp
                              </button>
                              <button
                                on:click={() => shoppingListStore.duplicateList(list.id)}
                                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Duplicar lista
                              </button>
                              <button
                                on:click={() => shoppingListStore.deleteList(list.id)}
                                class="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                              >
                                Excluir lista
                              </button>
                            </div>
                          </div>
                        {/if}
                      </div>
                    </div>

                    <div class="flex flex-col space-y-1">
                      <p class="text-sm text-gray-500">
                        Criada em: {formatDate(list.createdAt)}
                      </p>
                      <p class="text-sm text-gray-500">
                        Última atualização: {formatDate(list.updatedAt)}
                      </p>
                      <p class="text-sm font-medium text-indigo-600">
                        Total previsto: {formatCurrency(calculateListTotal(list))}
                      </p>
                    </div>

                    <div class="flex flex-col space-y-2">
                      <h5 class="text-sm font-medium text-gray-700">Itens:</h5>
                      {#if list.items.length === 0}
                        <p class="text-sm text-gray-500">Nenhum item adicionado</p>
                      {:else}
                        <ul class="space-y-2">
                          {#each list.items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) as item}
                            <li class="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                              <div class="flex-1 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  on:change={() => shoppingListStore.toggleItemChecked(list.id, item.productId)}
                                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                                >
                                <div class="flex-1">
                                  <span class="text-sm text-gray-900" class:line-through={item.checked} class:text-gray-400={item.checked}>
                                    {item.name}
                                  </span>
                                  <span class="text-sm text-gray-500 ml-2">
                                    ({formatCurrency(getProductAveragePrice(item.productId))}/un)
                                  </span>
                                </div>
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

                    <div class="flex items-center space-x-2">
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
                      <div class="mt-2">
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Sugestões baseadas no histórico:</h5>
                        {#if getSuggestedProducts(list).length === 0}
                          <p class="text-sm text-gray-500">Nenhuma sugestão disponível no momento.</p>
                        {:else}
                          <div class="space-y-2">
                            {#each getSuggestedProducts(list).slice(0, expandedSuggestions[list.id] ? undefined : 10) as product}
                              <div class="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                <div class="flex-1">
                                  <div class="flex items-center">
                                    <p class="text-sm font-medium text-gray-900">{product.name}</p>
                                    <button
                                      on:click={() => shoppingListStore.toggleFavorite(product.productId)}
                                      class="ml-2 p-1 text-gray-400 hover:text-yellow-500 focus:outline-none"
                                      title={product.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                    >
                                      <svg
                                        class={`h-4 w-4 ${product.isFavorite ? 'text-yellow-500' : ''}`}
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
                                  </div>
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