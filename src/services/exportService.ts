import * as XLSX from 'xlsx';

export function downloadCsv(data: Record<string, any>[], filename: string) {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultiSheetExcel(sheets: { name: string; data: Record<string, any>[] }[], filename: string) {
  const workbook = XLSX.utils.book_new();

  for (const s of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(s.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, s.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
