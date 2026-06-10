import * as XLSX from "xlsx";
import type { DebtorInput } from "./calculations";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date
    return XLSX.SSF.parse_date_code(value) ? new Date((value - 25569) * 86400 * 1000) : null;
  }
  if (typeof value === "string") {
    const parts = value.split(/[\/\-]/);
    if (parts.length === 3) {
      // dd/mm/yyyy or yyyy-mm-dd
      if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  return null;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[R$\s.]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// Format 1: Serasa export (Devedor, Documento/E, Valor/G, Data Venc./L)
// Format 2: Template (CPF_CNPJ_DEVEDOR, CONTRATO_DIVIDA, VALOR_DIVIDA, DATA_VENCIMENTO_DIVIDA)
export function parseExcel(file: File): Promise<DebtorInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) { resolve([]); return; }

        const headers = Object.keys(rows[0]).map((h) => h.toString().trim().toUpperCase());

        const isFormat2 =
          headers.some((h) => h.includes("CPF_CNPJ")) ||
          headers.some((h) => h.includes("VALOR_DIVIDA"));

        const devedores: DebtorInput[] = [];

        for (const row of rows) {
          let nome = "";
          let documento = "";
          let valorOriginal = 0;
          let dataVencimento: Date | null = null;

          if (isFormat2) {
            const cpfKey = Object.keys(row).find((k) => k.toUpperCase().includes("CPF_CNPJ"));
            const valorKey = Object.keys(row).find((k) => k.toUpperCase().includes("VALOR_DIVIDA"));
            const dataKey = Object.keys(row).find((k) => k.toUpperCase().includes("DATA_VENCIMENTO"));
            const contratoKey = Object.keys(row).find((k) => k.toUpperCase().includes("CONTRATO"));

            documento = cpfKey ? String(row[cpfKey]).trim() : "";
            nome = contratoKey ? String(row[contratoKey]).trim() : documento;
            valorOriginal = valorKey ? parseNumber(row[valorKey]) : 0;
            dataVencimento = dataKey ? parseDate(row[dataKey]) : null;
          } else {
            // Format 1 — find by column header name
            const nomeKey = Object.keys(row).find((k) => k.toUpperCase().includes("DEVEDOR"));
            const docKey = Object.keys(row).find((k) =>
              k.toUpperCase().includes("DOCUMENTO") || k.toUpperCase().includes("CPF")
            );
            const valorKey = Object.keys(row).find((k) =>
              k.toUpperCase() === "VALOR" || k.toUpperCase().includes("VALOR")
            );
            const dataKey = Object.keys(row).find((k) =>
              k.toUpperCase().includes("VENC") || k.toUpperCase().includes("DATA VENC")
            );

            nome = nomeKey ? String(row[nomeKey]).trim() : "";
            documento = docKey ? String(row[docKey]).trim() : "";
            valorOriginal = valorKey ? parseNumber(row[valorKey]) : 0;
            dataVencimento = dataKey ? parseDate(row[dataKey]) : null;
          }

          if (!dataVencimento || valorOriginal <= 0) continue;

          devedores.push({ nome: nome || documento || "Devedor", documento, valorOriginal, dataVencimento });
        }

        resolve(devedores);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}
