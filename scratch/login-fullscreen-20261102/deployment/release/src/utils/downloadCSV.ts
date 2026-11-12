// Generic CSV download — shared by every report view's "Export CSV" action so
// the blob-building/anchor-click boilerplate exists in exactly one place.
export function downloadCSV(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const csvContent =
    "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
