const { promises: fsPromises } = require("fs");
const moment = require("moment");
const pdf = require("pdf-parse");

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
      throw new Error("Arquivo não é um PDF");
    }

    const dataBuffer = await fsPromises.readFile(path);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error("Erro ao ler o PDF:", err);
    return "";
  }
}

class Produto {
  constructor({
    quantidade,
    nome,
    precoUnitario,
    precoTotal,
    peso = null,
    precoPorKg = null,
    substituido = null,
    esgotado = false,
  }) {
    this.quantidade = quantidade;
    this.nome = nome;
    this.precoUnitario = precoUnitario;
    this.precoTotal = precoTotal;
    this.peso = peso;
    this.precoPorKg = precoPorKg;
    this.substituido = substituido;
    this.esgotado = esgotado;
  }
}

function parseRecibo(texto) {
  // Extrair data
  const dataMatch = texto.match(/(\d+) de (\w+) de (\d{4})/);
  const data = `${dataMatch[1]} ${dataMatch[2]} ${dataMatch[3]}`;

  // Extrair valor total
  const totalMatch = texto.match(/TotalR\$ ([\d,]+)/);
  const total = parseFloat(totalMatch[1].replace(",", "."));

  const produtos = [];
  const linhas = texto.split("\n");

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();

    // Procurar por padrão de quantidade e produto
    const quantidadeMatch = linha.match(/^(\d+)$/);
    if (quantidadeMatch) {
      const quantidade = parseInt(quantidadeMatch[1]);
      i++;

      const produtoInfo = linhas[i].trim();
      const precoMatch = produtoInfo.match(/R\$ ([\d,]+)/);

      if (precoMatch) {
        const precoTotal = parseFloat(precoMatch[1].replace(",", "."));

        // Extrair preço unitário da próxima linha
        i += 2;
        const precoUnitMatch = linhas[i].trim().match(/R\$ ([\d,]+)\/pc/);
        const precoUnitario = precoUnitMatch
          ? parseFloat(precoUnitMatch[1].replace(",", "."))
          : null;

        // Verificar se é produto por peso
        let peso = null;
        let precoPorKg = null;
        if (linhas[i].toLowerCase().includes("kg")) {
          const pesoMatch = linhas[i].match(/Final ([\d,]+) kg/);
          if (pesoMatch) {
            peso = parseFloat(pesoMatch[1].replace(",", "."));
          }
          const precoKgMatch = linhas[i].match(/R\$ ([\d,]+)\/kg/);
          if (precoKgMatch) {
            precoPorKg = parseFloat(precoKgMatch[1].replace(",", "."));
          }
        }

        // Verificar se produto foi substituído
        let substituido = null;
        if (i + 1 < linhas.length && linhas[i + 1].includes("Substituído")) {
          substituido = linhas[i + 1].replace("Substituído", "").trim();
        }

        // Verificar se produto está esgotado
        const esgotado = produtoInfo.includes("Esgotado");

        const produto = new Produto({
          quantidade,
          nome: produtoInfo.split("R$")[0].trim(),
          precoUnitario,
          precoTotal,
          peso,
          precoPorKg,
          substituido,
          esgotado,
        });

        produtos.push(produto);
      }
    }
  }

  return {
    data,
    total,
    produtos,
  };
}

async function parseProducts(files) {
  const results = [];
  for (const file of files) {
    console.log("\n\n--------------------------------");
    console.log(`Lendo arquivo: ${file}`);
    const texto = await extractText(`./src/input/${file}`);
    const resultado = parseRecibo(texto);

    results.push(resultado);

    console.log("Data:", resultado.data);
    console.log("Total:", resultado.total);
    console.log("\nProdutos:");
    resultado.produtos.forEach((produto) => {
      console.log("\n-------------------");
      console.log(`Quantidade: ${produto.quantidade}`);
      console.log(`Produto: ${produto.nome}`);
      console.log(`Preço unitário: R$ ${produto.precoUnitario}`);
      console.log(`Preço total: R$ ${produto.precoTotal}`);
      if (produto.peso) {
        console.log(`Peso: ${produto.peso}kg`);
      }
      if (produto.precoPorKg) {
        console.log(`Preço por kg: R$ ${produto.precoPorKg}`);
      }
      if (produto.substituido) {
        console.log(`Substituído por: ${produto.substituido}`);
      }
      if (produto.esgotado) {
        console.log("Produto esgotado");
      }
    });
  }

  return results;
}

function parseRows(results) {
  return results.map((result) => {
    return result.produtos.map((produto) => {
      return {
        data: moment(result.data, "D m YYYY").format("YYYY-MM-DD"),
        produto: produto.nome,
        quantidade: produto.quantidade,
        precoTotal: produto.precoTotal,
        precoTotalCents: produto.precoTotal * 100,
      };
    });
  }).flat();
}

async function main() {
  const files = await getFiles("./src/input");
  console.log(files);

  const results = await parseProducts(files);
  console.log(results);

  const rows = parseRows(results);

  console.log(rows);
}

main();

