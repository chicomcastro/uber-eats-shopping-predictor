# Uber Eats Shopping Predictor

A Node.js application that analyzes PDF receipts from Uber Eats, extracts purchase data, and predicts future shopping needs based on purchase patterns.

It is a simple and easy-to-use tool that helps you understand your shopping habits and make better decisions about what to buy next.

It was built to help me understand my Uber Eats supermarket shopping habits and make better decisions about what to buy next.

You can find your Uber Eats receipts at https://www.ubereats.com/br/orders.

## Features

- PDF receipt parsing
- Purchase history tracking
- Product metrics analysis
- Shopping prediction based on purchase patterns
- Detailed purchase statistics
- Export data to JSON files

## Prerequisites

- Node.js (version 12 or higher)
- NPM (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/chicomcastro/uber-eats-shopping-predictor.git
cd uber-eats-shopping-predictor
```

2. Install dependencies:
```bash
npm install
```

## Project Structure

```
.
├── src/
│   ├── input/      # Place PDF receipts here
│   │   └── example-receipt.pdf    # Example receipt format
│   ├── output/     # JSON output files
│   └── index.js    # Main application file
```

## Usage

1. Place your PDF receipts in the `src/input` directory

2. Run the application:
```bash
node src/index.js
```

3. The application will:
   - Parse all PDF receipts in the input directory
   - Generate purchase analysis
   - Create prediction for next shopping trip
   - Export data to JSON files in the output directory

## Output Files

The application generates three JSON files in the `src/output` directory:

- `purchases.json`: Raw purchase data from receipts
- `purchaseProducts.json`: Detailed product information from all purchases
- `productMetrics.json`: Analytics and metrics for each product

## Data Analysis

The application provides several metrics:
- Purchase frequency per product
- Average price per product
- Quantity patterns
- Predicted shopping needs
- Total spending estimates

## Console Output

The application will display:
- Average days between purchases
- Next predicted purchase date
- Suggested shopping list with:
  - Product names
  - Purchase frequency
  - Typical quantities
  - Average prices
  - Total estimated cost

## Dependencies

- `fs`: File system operations
- `moment`: Date handling
- `pdf-parse`: PDF text extraction
- `uuid`: Unique ID generation

## License

MIT License

## Contributing

Contributions are welcome! Please see the CONTRIBUTING.md file for details.

## Author

Francisco Castro (https://github.com/chicomcastro)
