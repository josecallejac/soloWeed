const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const content = fs.readFileSync('reports/catalog-audit/latest/09-four-store-curated.csv', 'utf-8');
const lines = content.split('\n').slice(1).filter(l => l.trim());

console.log('Current 4-store products: ' + lines.length);
console.log('');
for (const line of lines) {
  const parts = parseCSVLine(line);
  console.log('#' + parts[0] + ' ' + parts[1].substring(0, 50));
}