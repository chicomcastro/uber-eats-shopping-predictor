# Market Purchases Control

Uma aplicação web construída com SvelteKit para analisar recibos em PDF do Uber Eats, extrair dados de compras e gerenciar listas de compras.

É uma ferramenta simples e fácil de usar que ajuda você a entender seus hábitos de compra, gerenciar suas listas de compras e tomar melhores decisões sobre o que comprar.

Foi construída para ajudar a entender os hábitos de compra em supermercados pelo Uber Eats e facilitar o gerenciamento de compras futuras.

Você pode encontrar seus recibos do Uber Eats em https://www.ubereats.com/br/orders.

## Funcionalidades

- Análise de recibos em PDF
- Rastreamento do histórico de compras
- Análise de métricas de produtos
- Estatísticas detalhadas de compras
- Gerenciamento de listas de compras
- Interface web moderna e responsiva
- Armazenamento local dos dados

## Tecnologias

- SvelteKit
- TailwindCSS
- Node.js
- PDF Parser

## Pré-requisitos

- Node.js (versão 16 ou superior)
- NPM (Node Package Manager)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/chicomcastro/market-purchases-control.git
cd market-purchases-control
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Estrutura do Projeto

```
.
├── src/
│   ├── lib/
│   │   ├── stores/           # Stores Svelte para gerenciamento de estado
│   │   └── utils/            # Funções utilitárias
│   ├── routes/               # Rotas da aplicação
│   │   ├── +page.svelte     # Página inicial (Upload)
│   │   ├── products/        # Página de produtos
│   │   ├── purchases/       # Página de compras
│   │   └── shopping-lists/  # Página de listas de compras
│   └── input/               # Diretório para recibos em PDF
│       └── .gitkeep
```

## Páginas

### Upload (/)
- Upload de recibos em PDF
- Processamento automático dos dados
- Visualização do status do upload

### Compras (/purchases)
- Histórico completo de compras
- Detalhes de cada compra
- Filtros e ordenação

### Produtos (/products)
- Lista de todos os produtos comprados
- Métricas por produto:
  - Total gasto
  - Quantidade total
  - Número de compras
  - Preço médio
  - Média de dias entre compras
  - Variantes do produto

### Listas de Compras (/shopping-lists)
- Criação e gerenciamento de listas de compras
- Adição de produtos às listas
- Controle de quantidade por item
- Remoção de itens
- Exclusão de listas
- Salvamento automático no navegador

## Armazenamento

A aplicação utiliza o localStorage do navegador para:
- Dados de compras processados
- Listas de compras
- Preferências do usuário

## Contribuindo

Contribuições são bem-vindas! Por favor, veja o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

## Autor

Francisco Castro (https://github.com/chicomcastro)

## Licença

MIT License
