const fs = require('fs');

const text = fs.readFileSync('scratch/extracted_doc_text.txt', 'utf8');

let pos = text.toLowerCase().indexOf('data dictionary of');
while (pos !== -1) {
  console.log('=== DATA DICTIONARY ENTRY ===');
  console.log(text.substring(pos, Math.min(text.length, pos + 1000)).replace(/\s+/g, ' '));
  pos = text.toLowerCase().indexOf('data dictionary of', pos + 20);
}
