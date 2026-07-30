const fs = require('fs');

const text = fs.readFileSync('scratch/extracted_doc_text.txt', 'utf8');

// Find all mentions of "3rd Normal Form" or "Table" around pages 400-500
let idx = 0;
const results = [];
while ((idx = text.toLowerCase().indexOf('3rd normal form', idx)) !== -1) {
  const snippet = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 600)).replace(/\s+/g, ' ');
  results.push(snippet);
  idx += 15;
}

console.log(`Found ${results.length} occurrences of 3rd Normal Form:`);
results.forEach((r, i) => {
  console.log(`\n--- Result ${i + 1} ---`);
  console.log(r);
});
