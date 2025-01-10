<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { shoppingListStore } from '$lib/stores/shoppingListStore';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  const isLoaded = writable(false);

  onMount(() => {
    purchaseStore.loadFromStorage();
    isLoaded.set(true);
  });
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <span class="text-xl font-bold">Controle de Compras</span>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <a
              href="{base}/"
              class:active={$page.url.pathname === `${base}/`}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Upload
            </a>
            <a
              href="{base}/purchases"
              class:active={$page.url.pathname === `${base}/purchases`}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Compras
            </a>
            <a
              href="{base}/products"
              class:active={$page.url.pathname === `${base}/products`}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Produtos
            </a>
            <a
              href="{base}/shopping-lists"
              class:active={$page.url.pathname === `${base}/shopping-lists`}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Listas de Compras
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>

  {#if $isLoaded}
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  {:else}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .active {
    border-color: rgb(99 102 241);
  }
</style> 