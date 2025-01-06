<script>
  import Dropzone from "svelte-file-dropzone";
  import { purchaseStore } from '$lib/stores/purchaseStore';
  import { v4 as uuidv4 } from 'uuid';
  import moment from 'moment';
  import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
  import { base } from '$app/paths';

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let files = {
    accepted: [],
    rejected: []
  };

  let isProcessing = false;
  let processedFiles = new Set();
  let showSuccess = false;
  let successTimeout;
  let errorMessage = '';
  let showError = false;

  const monthsInPortuguese = {
    'janeiro': '01',
    'fevereiro': '02',
    'março': '03',
    'abril': '04',
    'maio': '05',
    'junho': '06',
    'julho': '07',
    'agosto': '08',
    'setembro': '09',
    'outubro': '10',
    'novembro': '11',
    'dezembro': '12'
  };

  class Product {
    constructor({
      quantity,
      name,
      unitPrice,
      totalPrice,
      weight = null,
      pricePerKg = null,
      substituted = null,
      outOfStock = false,
    }) {
      this.id = uuidv4();
      this.quantity = quantity;
      this.name = name;
      this.unitPrice = unitPrice;
      this.totalPrice = totalPrice;
      this.weight = weight;
      this.pricePerKg = pricePerKg;
      this.substituted = substituted;
      this.outOfStock = outOfStock;
    }
  }

  async function parseReceipt(dataBuffer) {
    try {
      const typedArray = new Uint8Array(dataBuffer);
      console.log('Iniciando carregamento do PDF...');
      const loadingTask = pdfjsLib.getDocument({
        data: typedArray,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      console.log('Aguardando promise do PDF...');
      const pdf = await loadingTask.promise;
      console.log('PDF carregado, obtendo primeira página...');
      const page = await pdf.getPage(1);
      console.log('Extraindo texto da página...');
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join('\n');
      console.log('Texto extraído:', text);

      if (!text) {
        console.log('Nenhum texto encontrado no PDF');
        return null;
      }

      // Extract date
      const dateMatch = text.match(/(\d+) de (\w+) de (\d{4})/);
      if (!dateMatch) {
        console.log('Não foi possível encontrar a data no formato esperado');
        return null;
      }
      console.log('Data encontrada:', dateMatch[0]);

      // Quebra a data em partes
      const [day, monthInPortuguese, year] = dateMatch.slice(1);
      console.log('Partes da data:', { day, monthInPortuguese, year });

      // Converte o mês em português para número
      const month = monthsInPortuguese[monthInPortuguese.toLowerCase()];
      if (!month) {
        console.log('Mês não reconhecido:', monthInPortuguese);
        return null;
      }

      // Formata a data no padrão YYYY-MM-DD
      const date = `${year}-${month}-${day.padStart(2, '0')}`;
      console.log('Data formatada:', date);

      // Extract total value
      let total;
      const totalMatch = text.match(/Total\s*\nR\$\s*([\d,]+)/);
      if (!totalMatch) {
        console.log('Não foi possível encontrar o valor total no formato esperado');
        console.log('Tentando formato alternativo...');
        // Try alternative format
        const alternativeTotalMatch = text.match(/Total\s*R\$\s*([\d,]+)/);
        if (!alternativeTotalMatch) {
          console.log('Não foi possível encontrar o valor total em nenhum formato');
          return null;
        }
        console.log('Total encontrado (formato alternativo):', alternativeTotalMatch[1]);
        total = parseFloat(alternativeTotalMatch[1].replace(",", "."));
      } else {
        console.log('Total encontrado:', totalMatch[1]);
        total = parseFloat(totalMatch[1].replace(",", "."));
      }

      const products = [];
      const lines = text.split("\n");
      console.log('Número de linhas encontradas:', lines.length);

      // Ajustando o padrão de busca para produtos
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        console.log(`Analisando linha ${i}:`, line);

        // Look for quantity and product pattern
        const quantityMatch = line.match(/^(\d+)\s*$/);
        if (quantityMatch) {
          console.log('Quantidade encontrada:', quantityMatch[1]);
          const quantity = parseInt(quantityMatch[1]);
          i++;

          if (i >= lines.length) break;

          // Skip empty lines to find product name
          while (i < lines.length && !lines[i].trim()) {
            i++;
          }

          if (i >= lines.length) break;

          const productInfo = lines[i].trim();
          console.log('Informação do produto:', productInfo);
          
          // Move to price line
          i++;
          while (i < lines.length && !lines[i].includes('R$')) {
            i++;
          }

          if (i >= lines.length) break;

          const priceLine = lines[i].trim();
          const priceMatch = priceLine.match(/R\$\s*([\d,]+)/);

          if (priceMatch) {
            console.log('Preço encontrado:', priceMatch[1]);
            const totalPrice = parseFloat(priceMatch[1].replace(",", "."));

            // Move to unit price line
            i++;
            while (i < lines.length && !lines[i].trim()) {
              i++;
            }
            
            if (i >= lines.length) break;
            
            const unitPriceLine = lines[i].trim();
            console.log('Linha do preço unitário:', unitPriceLine);
            const unitPriceMatch = unitPriceLine.match(/R\$\s*([\d,]+)\/pc/);
            let unitPrice = null;
            
            if (unitPriceMatch) {
              unitPrice = parseFloat(unitPriceMatch[1].replace(",", "."));
              console.log('Preço unitário encontrado:', unitPrice);
            }

            // Check if product is sold by weight
            let weight = null;
            let pricePerKg = null;
            if (unitPriceLine.toLowerCase().includes("kg")) {
              const weightMatch = unitPriceLine.match(/Final\s*([\d,]+)\s*kg/);
              if (weightMatch) {
                weight = parseFloat(weightMatch[1].replace(",", "."));
                console.log('Peso encontrado:', weight);
              }
              const priceKgMatch = unitPriceLine.match(/R\$\s*([\d,]+)\/kg/);
              if (priceKgMatch) {
                pricePerKg = parseFloat(priceKgMatch[1].replace(",", "."));
                console.log('Preço por kg encontrado:', pricePerKg);
              }
            }

            // Check if product was substituted
            let substituted = null;
            i++;
            while (i < lines.length && !lines[i].trim()) {
              i++;
            }
            if (i < lines.length && lines[i].includes("Substituído")) {
              substituted = lines[i].replace("Substituído", "").trim();
              console.log('Produto substituído por:', substituted);
            } else {
              i--; // Volta uma linha se não encontrou substituição
            }

            // Check if product is out of stock
            const outOfStock = productInfo.includes("Esgotado");
            if (outOfStock) {
              console.log('Produto esgotado');
            }

            const product = new Product({
              quantity,
              name: productInfo,
              unitPrice,
              totalPrice,
              weight,
              pricePerKg,
              substituted,
              outOfStock,
            });

            products.push(product);
            console.log('Produto adicionado:', product);
          }
        }
      }

      const purchase = {
        id: uuidv4(),
        date,
        total,
        products,
      };

      const purchaseProducts = products.map(product => ({
        purchaseId: purchase.id,
        purchaseProductId: product.id,
        date: purchase.date,
        productName: product.name,
        quantity: product.quantity,
        totalPrice: product.totalPrice,
        totalPriceCents: product.totalPrice * 100,
        unitPrice: product.unitPrice,
        weight: product.weight,
        pricePerKg: product.pricePerKg,
        substituted: product.substituted,
        outOfStock: product.outOfStock,
      }));

      const distinctProducts = purchaseProducts
        .filter((row, index, self) =>
          index === self.findIndex((t) => t.productName === row.productName)
        )
        .map(product => ({
          productName: product.productName,
          productId: uuidv4(),
        }));

      const purchaseProductsWithProductId = purchaseProducts.map(row => {
        const product = distinctProducts.find(p => p.productName === row.productName);
        return { ...row, productId: product.productId };
      });

      const productMetrics = purchaseProductsWithProductId.reduce((acc, purchaseProduct) => {
        if (!acc[purchaseProduct.productId]) {
          acc[purchaseProduct.productId] = {
            productName: purchaseProduct.productName,
            totalInCents: 0,
            quantity: 0,
            purchases: [],
            purchaseCount: 0,
            averagePrice: 0,
            averageDaysBetweenPurchases: 0,
          };
        }

        acc[purchaseProduct.productId].totalInCents = Math.round(
          (acc[purchaseProduct.productId]?.totalInCents || 0) + purchaseProduct.totalPriceCents
        );

        acc[purchaseProduct.productId].quantity += purchaseProduct.quantity;
        acc[purchaseProduct.productId].purchases.push(purchaseProduct.purchaseId);
        acc[purchaseProduct.productId].purchaseCount += 1;
        acc[purchaseProduct.productId].averagePrice = 
          acc[purchaseProduct.productId].totalInCents / acc[purchaseProduct.productId].quantity;

        const productPurchases = purchaseProductsWithProductId
          .filter(p => p.productId === purchaseProduct.productId)
          .sort((a, b) => moment(a.date).diff(moment(b.date)));

        if (productPurchases.length >= 2) {
          const daysBetweenPurchases = productPurchases.reduce((total, purchase, index) => {
            if (index === 0) return 0;
            const daysDiff = moment(purchase.date).diff(moment(productPurchases[index - 1].date), 'days');
            return total + daysDiff;
          }, 0);

          acc[purchaseProduct.productId].averageDaysBetweenPurchases = 
            daysBetweenPurchases / (productPurchases.length - 1);
        }

        return acc;
      }, {});

      return {
        purchases: [purchase],
        products: distinctProducts,
        purchaseProducts: purchaseProductsWithProductId,
        productMetrics
      };
    } catch (error) {
      console.error('Erro detalhado:', error);
      console.error('Stack trace:', error.stack);
      return null;
    }
  }

  async function handleFilesSelect(e) {
    const { acceptedFiles, fileRejections } = e.detail;
    files.accepted = acceptedFiles;
    files.rejected = fileRejections;
    processedFiles.clear();
    isProcessing = true;
    errorMessage = '';
    showError = false;

    for (const file of acceptedFiles) {
      try {
        console.log('Processando arquivo:', file.name);
        const arrayBuffer = await file.arrayBuffer();
        console.log('Buffer criado, iniciando parseReceipt');
        const result = await parseReceipt(arrayBuffer);
        console.log('Resultado do parseReceipt:', result);

        if (result) {
          console.log('Produtos encontrados:', result.purchases[0].products.length);
          const currentPurchases = $purchaseStore.purchases || [];
          const currentProducts = $purchaseStore.products || [];
          const currentPurchaseProducts = $purchaseStore.purchaseProducts || [];
          const currentProductMetrics = $purchaseStore.productMetrics || {};

          purchaseStore.setPurchases([...currentPurchases, ...result.purchases]);
          purchaseStore.setProducts([...currentProducts, ...result.products]);
          purchaseStore.setPurchaseProducts([...currentPurchaseProducts, ...result.purchaseProducts]);
          purchaseStore.setProductMetrics({
            ...currentProductMetrics,
            ...result.productMetrics
          });
          purchaseStore.saveToStorage();
          processedFiles.add(file.name);
        } else {
          errorMessage = `Não foi possível extrair dados do arquivo ${file.name}. Verifique se é uma nota fiscal válida.`;
          showError = true;
        }
      } catch (error) {
        console.error('Error processing receipt:', error);
        errorMessage = `Erro ao processar o arquivo ${file.name}: ${error.message}`;
        showError = true;
      }
    }

    isProcessing = false;
    
    if (processedFiles.size > 0) {
      showSuccess = true;
      if (successTimeout) clearTimeout(successTimeout);
      successTimeout = setTimeout(() => {
        showSuccess = false;
      }, 3000);
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
              {#if isProcessing}
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p class="mt-4 text-sm text-gray-600">
                  Processando arquivos...
                </p>
              {:else}
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
              {/if}
            </div>
          </Dropzone>
        </div>

        {#if showError}
          <div class="mt-4 p-4 rounded-md bg-red-50">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  Erro no processamento
                </h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>{errorMessage}</p>
                </div>
              </div>
            </div>
          </div>
        {/if}

        {#if showSuccess}
          <div class="mt-4 p-4 rounded-md bg-green-50">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">
                  Processamento concluído com sucesso!
                </h3>
                <div class="mt-2 text-sm text-green-700">
                  <p>
                    {processedFiles.size} {processedFiles.size === 1 ? 'arquivo processado' : 'arquivos processados'}.
                    {#if processedFiles.size > 0}
                      <br>
                      Você pode ver os resultados nas páginas de <a href="{base}/purchases" class="underline">Compras</a> e <a href="{base}/products" class="underline">Produtos</a>.
                    {/if}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/if}

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
                    {#if processedFiles.has(file.name)}
                      <span class="ml-2 text-green-600">
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </span>
                    {/if}
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