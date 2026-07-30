const fs = require('fs');

const text = fs.readFileSync('scratch/extracted_doc_text.txt', 'utf8');

// Search for Data Dictionary or Table sections
const matches = [];
const regex = /(?:Table|Data Dictionary|Entity|tbl_\w+|\b[A-Z][a-z]+ Table\b)/gi;
let m;

console.log('Searching for database tables and data dictionary in document...');
const ddPos = text.toLowerCase().indexOf('data dictionary');
if (ddPos !== -1) {
  console.log('Found Data Dictionary at offset:', ddPos);
  console.log('=== DATA DICTIONARY SECTION SNIPPET ===');
  console.log(text.substring(ddPos, ddPos + 5000).replace(/\s+/g, ' '));
} else {
  console.log('Data dictionary heading not found directly, searching for table mentions...');
}

// Search for table structures or field names
const keywords = ['Data Dictionary', 'Table 1', 'Table 2', 'User Table', 'Errand Table', 'Merchant Table', 'Rate Table', 'Rider Table', 'Audit Table'];
keywords.forEach(kw => {
  let idx = 0;
  while ((idx = text.indexOf(kw, idx)) !== -1) {
    console.log(`\n--- Match: ${kw} at ${idx} ---`);
    console.log(text.substring(Math.max(0, idx - 50), Math.min(text.length, idx + 400)).replace(/\s+/g, ' '));
    idx += kw.length;
  }
});
