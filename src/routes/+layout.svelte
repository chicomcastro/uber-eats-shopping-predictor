<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { onMount } from 'svelte';

  onMount(() => {
    purchaseStore.loadFromStorage();
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
              href="/"
              class:active={$page.url.pathname === '/'}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Upload
            </a>
            <a
              href="/purchases"
              class:active={$page.url.pathname === '/purchases'}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Compras
            </a>
            <a
              href="/products"
              class:active={$page.url.pathname === '/products'}
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent"
            >
              Produtos
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <slot />
  </main>
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