const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (!fs.existsSync('scratch')) {
  fs.mkdirSync('scratch', { recursive: true });
}

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('Mobile-based_Errand_Service_System_Document_Polishing.docx')
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
$cleanText = $content -replace '<[^>]+>', ' '
[System.IO.File]::WriteAllText('scratch/extracted_doc_text.txt', $cleanText)
`;

fs.writeFileSync('scratch/extract.ps1', psScript);
console.log('Running PowerShell extraction script...');
execSync('powershell -ExecutionPolicy Bypass -File scratch/extract.ps1');
console.log('Extraction complete. Reading scratch/extracted_doc_text.txt...');

const text = fs.readFileSync('scratch/extracted_doc_text.txt', 'utf8').replace(/\s+/g, ' ');
console.log('Total characters:', text.length);

const terms = ['Data Dictionary', 'Table', 'tbl_', 'User', 'Errand', 'Merchant', 'Rate', 'Rider', 'Payment', 'Review', 'Feedback', 'Notification'];
terms.forEach(term => {
  console.log(`\n=== MATCHES FOR: "${term}" ===`);
  let idx = 0, count = 0;
  while ((idx = text.toLowerCase().indexOf(term.toLowerCase(), idx)) !== -1 && count < 4) {
    console.log(`[${idx}] ` + text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 200)));
    idx += term.length;
    count++;
  }
});
