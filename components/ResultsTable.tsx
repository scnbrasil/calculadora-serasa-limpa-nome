"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import type { DebtorResult, Config } from "@/lib/calculations";
import { getDiscount, type PaymentMethod, type Profile } from "@/lib/discount-tables";
import { formatBRL, formatDate } from "@/lib/utils";

type SortKey = keyof DebtorResult;

const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; maxParcelas: number }[] = [
  { method: "avista",  label: "À vista",    maxParcelas: 1  },
  { method: "2a3",     label: "2x – 3x",    maxParcelas: 3  },
  { method: "4a6",     label: "4x – 6x",    maxParcelas: 6  },
  { method: "7a12",    label: "7x – 12x",   maxParcelas: 12 },
  { method: "13a18",   label: "13x – 18x",  maxParcelas: 18 },
  { method: "19a24",   label: "19x – 24x",  maxParcelas: 24 },
  { method: "25a36",   label: "25x – 36x",  maxParcelas: 36 },
];

function ParcelamentoPanel({
  result,
  perfil,
  valorMinimoParcela,
  selectedMethod,
}: {
  result: DebtorResult;
  perfil: Profile;
  valorMinimoParcela: number;
  selectedMethod: PaymentMethod;
}) {
  return (
    <div className="px-4 pb-4 pt-2 bg-[#f9fafb] border-t border-[#e8eaed]">
      <p className="text-xs font-semibold text-[#5e6976] uppercase tracking-wider mb-3">
        Simulação de parcelamento — {result.faixaDias}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {PAYMENT_OPTIONS.map(({ method, label, maxParcelas }) => {
          const desconto = getDiscount(perfil, result.diasAtraso, method);
          const valorComDesconto = result.valorAtualizado * (1 - desconto / 100);
          const parcelasMaximas = Math.floor(valorComDesconto / valorMinimoParcela);
          const parcelas = method === "avista" ? 1 : Math.max(1, Math.min(maxParcelas, parcelasMaximas));
          const valorParcela = valorComDesconto / parcelas;
          const isSelected = method === selectedMethod;

          return (
            <div
              key={method}
              className={`rounded-xl p-3 border-2 transition-all ${
                isSelected
                  ? "border-[#2a5595] bg-white shadow-sm"
                  : "border-[#e8eaed] bg-white"
              }`}
            >
              <p className={`text-xs font-semibold mb-2 ${isSelected ? "text-[#2a5595]" : "text-[#5e6976]"}`}>
                {label}
                {isSelected && (
                  <span className="ml-1 text-[10px] bg-[#ebf1fb] text-[#2a5595] px-1.5 py-0.5 rounded-full">selecionado</span>
                )}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5e6976]">Desconto</span>
                  <span className="text-xs font-bold text-[#e80070]">-{desconto}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5e6976]">Total</span>
                  <span className="text-xs font-semibold text-[#16a34a]">{formatBRL(valorComDesconto)}</span>
                </div>
                {method !== "avista" && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#5e6976]">{parcelas}x de</span>
                    <span className="text-xs font-semibold text-[#2a5595]">{formatBRL(valorParcela)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResultsTable({ results, config }: { results: DebtorResult[]; config: Config }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "diasAtraso", dir: "desc" });
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
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
              <th className="w-8 px-3 py-3" />
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
            {paged.map((r, i) => {
              const globalIdx = page * perPage + i;
              const isOpen = expanded.has(globalIdx);
              return (
                <>
                  <tr
                    key={`row-${i}`}
                    className={`border-b border-[#ced3d9] cursor-pointer transition-colors ${isOpen ? "bg-[#ebf1fb]" : "hover:bg-[#f4f5f7]"}`}
                    onClick={() => toggleExpand(globalIdx)}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <ChevronRight className={`w-3.5 h-3.5 text-[#2a5595] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </td>
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
                  {isOpen && (
                    <tr key={`expand-${i}`} className="border-b border-[#ced3d9]">
                      <td colSpan={12} className="p-0">
                        <ParcelamentoPanel
                          result={r}
                          perfil={config.perfil}
                          valorMinimoParcela={config.valorMinimoParcela}
                          selectedMethod={config.paymentMethod}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
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
              onClick={(e) => { e.stopPropagation(); setPage((p) => p - 1); }}
              className="px-3 py-1 rounded-lg border border-[#ced3d9] text-xs text-[#5e6976] disabled:opacity-40 hover:border-[#2a5595] hover:text-[#2a5595]"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={(e) => { e.stopPropagation(); setPage((p) => p + 1); }}
              className="px-3 py-1 rounded-lg border border-[#ced3d9] text-xs text-[#5e6976] disabled:opacity-40 hover:border-[#2a5595] hover:text-[#2a5595]"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-t border-[#e8eaed] bg-[#f4f5f7]">
        <p className="text-xs text-[#5e6976]">Clique em qualquer linha para ver todas as opções de parcelamento</p>
      </div>
    </div>
  );
}
