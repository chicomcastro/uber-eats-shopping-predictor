import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import pdf from 'pdf-parse';

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

export async function parseReceipt(dataBuffer) {
  try {
    const data = await pdf(dataBuffer);
    const text = data.text;

    if (!text) {
      return null;
    }

    // Extract date
    const dateMatch = text.match(/(\d+) de (\w+) de (\d{4})/);
    if (!dateMatch) {
      return null;
    }

    // Quebra a data em partes
    const [day, monthInPortuguese, year] = dateMatch.slice(1);

    // Converte o mês em português para número
    const month = monthsInPortuguese[monthInPortuguese.toLowerCase()];

    // Formata a data no padrão YYYY-MM-DD
    const date = `${year}-${month}-${day.padStart(2, '0')}`;

    // Extract total value
    const totalMatch = text.match(/TotalR\$ ([\d,]+)/);
    if (!totalMatch) {
      return null;
    }

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
    console.error('Error parsing receipt:', error);
    return null;
  }
}

