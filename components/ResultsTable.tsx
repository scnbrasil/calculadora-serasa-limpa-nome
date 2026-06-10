"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { DebtorResult } from "@/lib/calculations";
import { formatBRL, formatDate } from "@/lib/utils";

type SortKey = keyof DebtorResult;

export default function ResultsTable({ results }: { results: DebtorResult[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "diasAtraso", dir: "desc" });
  const [page, setPage] = useState(0);
  const perPage = 20;

  const sorted = [...results].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
    return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const paged = sorted.slice(page * perPage, page * perPage + perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const toggleSort = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
    setPage(0);
  };

  const Th = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-[#5e6976] cursor-pointer hover:text-[#2a5595] whitespace-nowrap select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sort.key === k ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-[#ced3d9] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f4f5f7] border-b border-[#ced3d9]">
            <tr>
              <Th label="Devedor" k="nome" />
              <Th label="Documento" k="documento" />
              <Th label="Vencimento" k="dataVencimento" />
              <Th label="Dias atraso" k="diasAtraso" />
              <Th label="Faixa" k="faixaDias" />
              <Th label="Valor original" k="valorOriginal" />
              <Th label="Atualizado" k="valorAtualizado" />
              <Th label="Desconto" k="percentualDesconto" />
              <Th label="Com desconto" k="valorComDesconto" />
              <Th label="Parcelas" k="parcelasEfetivas" />
              <Th label="Valor parcela" k="valorParcela" />
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={i} className="border-b border-[#ced3d9] hover:bg-[#f4f5f7] transition-colors">
                <td className="px-3 py-2.5 font-medium text-[#152b4a] max-w-[180px] truncate">{r.nome}</td>
                <td className="px-3 py-2.5 text-[#5e6976] text-xs">{r.documento}</td>
                <td className="px-3 py-2.5 text-[#5e6976] text-xs whitespace-nowrap">{formatDate(r.dataVencimento)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    r.diasAtraso > 720 ? "bg-red-100 text-red-700" :
                    r.diasAtraso > 360 ? "bg-orange-100 text-orange-700" :
                    r.diasAtraso > 90 ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {r.diasAtraso}d
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-[#5e6976] whitespace-nowrap">{r.faixaDias}</td>
                <td className="px-3 py-2.5 text-right text-[#152b4a]">{formatBRL(r.valorOriginal)}</td>
                <td className="px-3 py-2.5 text-right text-[#152b4a]">{formatBRL(r.valorAtualizado)}</td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-[#e80070] font-semibold">-{r.percentualDesconto}%</span>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-[#16a34a]">{formatBRL(r.valorComDesconto)}</td>
                <td className="px-3 py-2.5 text-center text-[#5e6976]">{r.parcelasEfetivas}x</td>
                <td className="px-3 py-2.5 text-right text-[#2a5595]">{formatBRL(r.valorParcela)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#ced3d9] bg-[#f4f5f7]">
          <p className="text-xs text-[#5e6976]">
            {page * perPage + 1}–{Math.min((page + 1) * perPage, results.length)} de {results.length} devedores
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-[#ced3d9] text-xs text-[#5e6976] disabled:opacity-40 hover:border-[#2a5595] hover:text-[#2a5595]"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-[#ced3d9] text-xs text-[#5e6976] disabled:opacity-40 hover:border-[#2a5595] hover:text-[#2a5595]"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
