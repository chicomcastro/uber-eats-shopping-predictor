<script>
  import Dropzone from "svelte-file-dropzone";
  import { purchaseStore } from '$lib/stores/purchaseStore';

  let files = {
    accepted: [],
    rejected: []
  };

  async function handleFilesSelect(e) {
    const { acceptedFiles, fileRejections } = e.detail;
    files.accepted = acceptedFiles;
    files.rejected = fileRejections;

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/process-receipt', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          purchaseStore.setPurchases([...data.purchases]);
          purchaseStore.setProducts([...data.products]);
          purchaseStore.setPurchaseProducts([...data.purchaseProducts]);
          purchaseStore.setProductMetrics(data.productMetrics);
          purchaseStore.saveToStorage();
        }
      } catch (error) {
        console.error('Error processing receipt:', error);
      }
    }
  }
</script>

<div class="py-10">
  <header>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold leading-tight text-gray-900">
        Upload de Notas Fiscais
      </h1>
    </div>
  </header>
  <main>
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      <div class="px-4 py-8 sm:px-0">
        <div class="border-4 border-dashed border-gray-200 rounded-lg p-10">
          <Dropzone
            accept=".pdf"
            on:drop={handleFilesSelect}
            class="w-full h-64 flex items-center justify-center"
          >
            <div class="text-center">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <p class="mt-1 text-sm text-gray-600">
                Arraste e solte arquivos PDF aqui, ou clique para selecionar
              </p>
              <p class="mt-1 text-xs text-gray-500">PDF até 10MB</p>
            </div>
          </Dropzone>
        </div>

        {#if files.accepted.length > 0}
          <div class="mt-4">
            <h3 class="text-lg font-medium text-gray-900">Arquivos aceitos</h3>
            <ul class="mt-2 divide-y divide-gray-200">
              {#each files.accepted as file}
                <li class="py-3 flex justify-between items-center">
                  <div class="flex items-center">
                    <span class="ml-2 flex-1 w-0 truncate">
                      {file.name}
                    </span>
                  </div>
                  <div class="ml-4 flex-shrink-0">
                    <span class="font-medium text-indigo-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if files.rejected.length > 0}
          <div class="mt-4">
            <h3 class="text-lg font-medium text-red-900">Arquivos rejeitados</h3>
            <ul class="mt-2 divide-y divide-gray-200">
              {#each files.rejected as rejection}
                <li class="py-3 flex justify-between items-center">
                  <div class="flex items-center">
                    <span class="ml-2 flex-1 w-0 truncate text-red-600">
                      {rejection.file.name} - {rejection.errors[0].message}
                    </span>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div> 