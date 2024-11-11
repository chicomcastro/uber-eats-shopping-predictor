const { promises: fsPromises } = require("fs");
const moment = require("moment");
const pdf = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");

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

async function getFiles(path) {
  try {
    const files = await fsPromises.readdir(path);
    return files;
  } catch (err) {
    console.error("Error reading directory:", err);
  }
}

async function extractText(path) {
  try {
    if (!path.toLowerCase().endsWith(".pdf")) {
      throw new Error("File is not a PDF");
    }

    const dataBuffer = await fsPromises.readFile(path);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error("Error reading PDF:", err);
    return "";
  }
}

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

function parseReceipt(text) {
  // Extract date
  const dateMatch = text.match(/(\d+) de (\w+) de (\d{4})/);

  // Quebra a data em partes
  const [day, monthInPortuguese, year] = dateMatch.slice(1);

  // Converte o mês em português para número
  const month = monthsInPortuguese[monthInPortuguese.toLowerCase()];

  // Formata a data no padrão YYYY-MM-DD
  const date = `${year}-${month}-${day.padStart(2, '0')}`;

  // Extract total value
  const totalMatch = text.match(/TotalR\$ ([\d,]+)/);
  const total = parseFloat(totalMatch[1].replace(",", "."));

  const products = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for quantity and product pattern
    const quantityMatch = line.match(/^(\d+)$/);
    if (quantityMatch) {
      const quantity = parseInt(quantityMatch[1]);
      i++;

      const productInfo = lines[i].trim();
      const priceMatch = productInfo.match(/R\$ ([\d,]+)/);

      if (priceMatch) {
        const totalPrice = parseFloat(priceMatch[1].replace(",", "."));

        // Extract unit price from next line
        i += 2;
        const unitPriceMatch = lines[i].trim().match(/R\$ ([\d,]+)\/pc/);
        const unitPrice = unitPriceMatch
          ? parseFloat(unitPriceMatch[1].replace(",", "."))
          : null;

        // Check if product is sold by weight
        let weight = null;
        let pricePerKg = null;
        if (lines[i].toLowerCase().includes("kg")) {
          const weightMatch = lines[i].match(/Final ([\d,]+) kg/);
          if (weightMatch) {
            weight = parseFloat(weightMatch[1].replace(",", "."));
          }
          const priceKgMatch = lines[i].match(/R\$ ([\d,]+)\/kg/);
          if (priceKgMatch) {
            pricePerKg = parseFloat(priceKgMatch[1].replace(",", "."));
          }
        }

        // Check if product was substituted
        let substituted = null;
        if (i + 1 < lines.length && lines[i + 1].includes("Substituído")) {
          substituted = lines[i + 1].replace("Substituído", "").trim();
        }

        // Check if product is out of stock
        const outOfStock = productInfo.includes("Esgotado");

        const product = new Product({
          quantity,
          name: productInfo.split("R$")[0].trim(),
          unitPrice,
          totalPrice,
          weight,
          pricePerKg,
          substituted,
          outOfStock,
        });

        products.push(product);
      }
    }
  }

  return {
    id: uuidv4(),
    date,
    total,
    products,
  };
}

async function parsePurchases(files) {
  const results = [];
  for (const file of files) {
    console.log("\n\n--------------------------------");
    console.log(`Reading file: ${file}`);
    const text = await extractText(`./src/input/${file}`);
    const result = parseReceipt(text);

    results.push(result);

    console.log("Date:", result.date);
    console.log("Total:", result.total);
    console.log("\nProducts:");
    result.products.forEach((product) => {
      console.log("\n-------------------");
      console.log(`Quantity: ${product.quantity}`);
      console.log(`Product: ${product.name}`);
      console.log(`Unit price: R$ ${product.unitPrice}`);
      console.log(`Total price: R$ ${product.totalPrice}`);
      if (product.weight) {
        console.log(`Weight: ${product.weight}kg`);
      }
      if (product.pricePerKg) {
        console.log(`Price per kg: R$ ${product.pricePerKg}`);
      }
      if (product.substituted) {
        console.log(`Substituted by: ${product.substituted}`);
      }
      if (product.outOfStock) {
        console.log("Product out of stock");
      }
    });
  }

  return results.sort((a, b) => moment(a.date).diff(moment(b.date)));
}

function parsePurchaseProducts(purchases) {
  return purchases.map((purchase) => {
    return purchase.products.map((product) => {
      return {
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
      };
    });
  }).flat().sort((a, b) => moment(a.date).diff(moment(b.date)));
}

function fillProductIds(rows, distinctProductsMap) {
  return rows.map((row) => {
    const product = distinctProductsMap.find((p) => p.productName === row.productName);
    return { ...row, productId: product.productId };
  });
}

function parseProductMetrics(purchaseProducts) {
  return purchaseProducts.reduce((acc, purchaseProduct) => {
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

    acc[purchaseProduct.productId].averagePrice = acc[purchaseProduct.productId].totalInCents / acc[purchaseProduct.productId].quantity;

    const productPurchases = purchaseProducts
      .filter(p => p.productId === purchaseProduct.productId)
      .sort((a, b) => moment(a.date).diff(moment(b.date)));

    if (productPurchases.length >= 2) {
      // Calcula a diferença de dias entre cada compra consecutiva
      const daysBetweenPurchases = productPurchases.reduce((total, purchase, index) => {
        if (index === 0) return 0;
        const daysDiff = moment(purchase.date).diff(moment(productPurchases[index - 1].date), 'days');
        return total + daysDiff;
      }, 0);

      // Calcula a média (total de dias dividido pelo número de intervalos)
      acc[purchaseProduct.productId].averageDaysBetweenPurchases = 
        daysBetweenPurchases / (productPurchases.length - 1);
    }

    return acc;
  }, {});
}

function predictNextPurchaseProducts(productMetrics, lastPurchaseDate, averageDaysBetweenPurchases) {
  const productsArray = Object.entries(productMetrics).map(([productId, metrics]) => ({
    productId,
    ...metrics,
    daysSinceLastPurchase: moment().diff(moment(lastPurchaseDate), 'days')
  }));

  console.log('\nDebug - Total products:', productsArray.length);

  const productsWithMultiplePurchases = productsArray.filter(product => product.purchaseCount >= 2);
  console.log('Products with 2+ purchases:', productsWithMultiplePurchases.length);

  const productsWithValidAverages = productsWithMultiplePurchases.filter(product => 
    !isNaN(product.averageDaysBetweenPurchases) && 
    product.averageDaysBetweenPurchases > 0
  );
  console.log('Products with valid averages:', productsWithValidAverages.length);

  // Calcular a data prevista para a próxima compra
  const nextPurchaseDate = moment(lastPurchaseDate).add(averageDaysBetweenPurchases, 'days');

  const productsNearThreshold = productsWithValidAverages.filter(product => {
    // Calcular quando este produto específico precisará ser comprado novamente
    const productNextPurchaseDate = moment(lastPurchaseDate).add(product.averageDaysBetweenPurchases, 'days');
    const needsToBePurchased = productNextPurchaseDate.isSameOrBefore(nextPurchaseDate);
    
    console.log(`${product.productName}: Next purchase date: ${productNextPurchaseDate.format('YYYY-MM-DD')}, Store visit date: ${nextPurchaseDate.format('YYYY-MM-DD')}, Needs purchase: ${needsToBePurchased}`);
    
    return needsToBePurchased;
  });
  console.log('Products needing purchase:', productsNearThreshold.length);

  const likelyProducts = productsNearThreshold
    .sort((a, b) => {
      // Ordenar por proximidade da data de compra
      const aNextPurchase = moment(lastPurchaseDate).add(a.averageDaysBetweenPurchases, 'days');
      const bNextPurchase = moment(lastPurchaseDate).add(b.averageDaysBetweenPurchases, 'days');
      return aNextPurchase.diff(bNextPurchase);
    })
    .map(product => ({
      name: product.productName,
      daysSinceLastPurchase: product.daysSinceLastPurchase,
      averagePurchaseFrequency: Math.round(product.averageDaysBetweenPurchases),
      nextPurchaseDate: moment(lastPurchaseDate).add(product.averageDaysBetweenPurchases, 'days').format('YYYY-MM-DD'),
      averageQuantityPerPurchase: Math.ceil(product.quantity / product.purchaseCount),
      averagePriceInReais: Math.round(product.averagePrice) / 100
    }));

  return likelyProducts;
}

async function main() {
  const files = await getFiles("./src/input");

  const purchases = await parsePurchases(files);

  await fsPromises.writeFile(
    "./src/output/purchases.json",
    JSON.stringify(purchases, null, 2)
  );

  const purchaseProducts = parsePurchaseProducts(purchases);

  const distinctProducts = purchaseProducts.filter(
    (row, index, self) =>
      index === self.findIndex((t) => t.productName === row.productName)
  );

  const distinctProductsMap = distinctProducts.map((product) => {
    return {
      productName: product.productName,
      productId: uuidv4(),
    };
  });

  const purchaseProductsWithProductId = fillProductIds(purchaseProducts, distinctProductsMap);

  await fsPromises.writeFile(
    "./src/output/purchaseProducts.json",
    JSON.stringify(purchaseProductsWithProductId, null, 2)
  );

  const productMetrics = parseProductMetrics(purchaseProductsWithProductId);

  await fsPromises.writeFile(
    "./src/output/productMetrics.json",
    JSON.stringify(productMetrics, null, 2)
  );

  const averageDaysBetweenPurchases = purchases.sort((a, b) => moment(a.date).diff(moment(b.date))).reduce((acc, purchase, index) => {
    if (index === 0) return 0;
    const previousPurchase = purchases[index - 1];
    return acc + moment(purchase.date, 'YYYY-MM-DD').diff(moment(previousPurchase.date, 'YYYY-MM-DD'), "days");
  }, 0) / (purchases.length - 1);

  console.log("Average days between purchases:", averageDaysBetweenPurchases);

  const lastPurchaseDate = moment(purchases[purchases.length - 1].date, 'YYYY-MM-DD');

  const nextPurchaseDate = lastPurchaseDate.add(averageDaysBetweenPurchases, 'days').format('YYYY-MM-DD');

  console.log("Next purchase date:", nextPurchaseDate);

  const suggestedProducts = predictNextPurchaseProducts(productMetrics, purchases[purchases.length - 1].date, Math.ceil(averageDaysBetweenPurchases));
  console.log("\nSuggested products for next purchase:");
  suggestedProducts.forEach((product, index) => {
    console.log(`\n${index + 1}. ${product.name}`);
    console.log(`   Average purchase frequency: every ${product.averagePurchaseFrequency} days`);
    console.log(`   Typical quantity: ${product.averageQuantityPerPurchase}`);
    console.log(`   Average price: R$ ${product.averagePriceInReais.toFixed(2)}`);
    console.log(`   Total spent: R$ ${(product.averageQuantityPerPurchase * product.averagePriceInReais).toFixed(2)}`);
  });

  const totalSuggestedProducts = suggestedProducts.reduce((acc, product) => acc + (product.averageQuantityPerPurchase * product.averagePriceInReais), 0);
  console.log(`\nTotal suggested products: ${suggestedProducts.length}`);
  console.log(`Total suggested amount: R$ ${totalSuggestedProducts.toFixed(2)}`);
}

main();

