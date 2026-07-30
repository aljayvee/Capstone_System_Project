
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
