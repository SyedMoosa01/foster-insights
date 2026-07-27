import type { CsvRow } from "../types";

export function parseCsv(text: string): CsvRow[] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) matrix.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) matrix.push(row);
  }

  if (matrix.length === 0) return [];
  const headers = matrix[0].map((header) => header.trim());

  return matrix.slice(1).map((values, rowIndex) => {
    const result: CsvRow = {};
    headers.forEach((header, columnIndex) => {
      if (!header) throw new Error(`CSV contains an empty header at column ${columnIndex + 1}.`);
      result[header] = (values[columnIndex] ?? "").trim();
    });
    if (values.length > headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} contains more values than headers.`);
    }
    return result;
  }).filter((record) => Object.values(record).some(Boolean));
}

export async function fetchCsv(url: string): Promise<CsvRow[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
  return parseCsv(await response.text());
}

export async function readCsvFile(file: File): Promise<CsvRow[]> {
  return parseCsv(await file.text());
}
