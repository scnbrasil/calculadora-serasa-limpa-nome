"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Settings2, BarChart3, ChevronRight, AlertCircle } from "lucide-react";
import { parseExcel } from "@/lib/excel-parser";
import { calcularCarteira, calcularResumo, type DebtorInput, type DebtorResult, type Config, type ResumoCarteira } from "@/lib/calculations";
import { formatBRL } from "@/lib/utils";
import type { Profile, PaymentMethod } from "@/lib/discount-tables";
import Dashboard from "./Dashboard";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  avista: "À vista",
  "2a3": "2x – 3x",
  "4a6": "4x – 6x",
  "7a12": "7x – 12x",
  "13a18": "13x – 18x",
  "19a24": "19x – 24x",
  "25a36": "25x – 36x",
};

const PROFILE_INFO: Record<Profile, { label: string; desc: string }> = {
  conservador: { label: "Conservador", desc: "Desconto menor — ideal quando não se conhece bem o perfil dos devedores" },
  moderado: { label: "Moderado", desc: "Desconto nivelado com o mercado — recomendado para dívidas do dia a dia" },
  arrojado: { label: "Arrojado", desc: "Desconto maior — recomendado para eventos específicos ou feirões" },
};

type Step = 1 | 2 | 3;

export default function Calculator() {
  const [step, setStep] = useState<Step>(1);
  const [devedores, setDevedores] = useState<DebtorInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<DebtorResult[]>([]);
  const [resumo, setResumo] = useState<ResumoCarteira | null>(null);
  const [clientName, setClientName] = useState("");

  const [config, setConfig] = useState<Config>({
    tipoJuros: "composto",
    taxaJurosAnual: 0,
    temMulta: false,
    valorMulta: 0,
    numeroParcelas: 4,
    valorMinimoParcela: 10,
    perfil: "moderado",
    paymentMethod: "avista",
  });

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setLoading(true);
    try {
      const parsed = await parseExcel(file);
      if (parsed.length === 0) {
        setError("Nenhum devedor encontrado. Verifique as colunas do arquivo.");
        setLoading(false);
        return;
      }
      setDevedores(parsed);
      setFileName(file.name);
      setStep(2);
    } catch {
      setError("Erro ao processar o arquivo. Verifique o formato.");
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleCalcular = () => {
    const res = calcularCarteira(devedores, config);
    setResults(res);
    setResumo(calcularResumo(res));
    setStep(3);
  };


  return (
    <div className="min-h-screen bg-[#efefef]">
      {/* Header */}
      <header className="bg-[#152b4a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logos/scn-serasa-branco.svg" alt="SCN Serasa" className="h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <p className="text-xs text-white/60 uppercase tracking-widest">Ferramenta Interna</p>
              <h1 className="text-base font-semibold">Calculadora Limpa Nome Parceiros</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            {(["1", "2", "3"] as const).map((s, i) => {
              const labels = ["Upload", "Configurar", "Resultado"];
              const active = step === i + 1;
              const done = step > i + 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 ${active ? "text-[#f08700]" : done ? "text-white/40" : "text-white/30"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${active ? "border-[#f08700] text-[#f08700]" : done ? "border-white/30 bg-white/20 text-white" : "border-white/20"}`}>
                      {done ? "✓" : s}
                    </span>
                    <span className={`hidden sm:inline text-xs ${active ? "font-semibold" : ""}`}>{labels[i]}</span>
                  </div>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-white/20" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* STEP 1 — Upload */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#152b4a]">Upload da carteira</h2>
              <p className="text-[#5e6976] mt-1">Suba o arquivo Excel com os devedores e dívidas do cliente</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#152b4a] mb-1">Nome do cliente (para o relatório)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-[#ced3d9] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5595]"
                placeholder="Ex: Loja XYZ Ltda"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div
              className="bg-white rounded-xl border-2 border-dashed border-[#ced3d9] hover:border-[#2a5595] transition-colors p-12 text-center cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#2a5595] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#5e6976]">Processando...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#ebf1fb] flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#2a5595]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#152b4a]">Arraste o arquivo aqui</p>
                    <p className="text-sm text-[#5e6976] mt-1">ou clique para selecionar</p>
                  </div>
                  <p className="text-xs text-[#5e6976] bg-[#f4f5f7] px-3 py-1 rounded-full">
                    Aceita .xlsx, .xls e .csv — Formatos Serasa e template SCN
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-6 bg-white rounded-xl border border-[#ced3d9] p-4">
              <p className="text-xs font-semibold text-[#5e6976] uppercase tracking-wider mb-3">Formatos suportados</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f4f5f7] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#2a5595]" />
                    <span className="text-xs font-semibold text-[#152b4a]">Exportação Serasa</span>
                  </div>
                  <p className="text-xs text-[#5e6976]">Devedor, Documento, Valor, Data Venc.</p>
                </div>
                <div className="bg-[#f4f5f7] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#2a5595]" />
                    <span className="text-xs font-semibold text-[#152b4a]">Template SCN</span>
                  </div>
                  <p className="text-xs text-[#5e6976]">CPF_CNPJ, CONTRATO, VALOR_DIVIDA, DATA_VENCIMENTO</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Config */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#152b4a]">Configurar oferta</h2>
                <p className="text-[#5e6976] mt-1">
                  <span className="font-medium text-[#2a5595]">{devedores.length}</span> devedores carregados de{" "}
                  <span className="font-medium">{fileName}</span>
                </p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-[#5e6976] hover:text-[#2a5595]">← Novo arquivo</button>
            </div>

            <div className="space-y-4">
              {/* Juros */}
              <div className="bg-white rounded-xl border border-[#ced3d9] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="w-4 h-4 text-[#2a5595]" />
                  <h3 className="font-semibold text-[#152b4a]">1. Juros e Multa</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#152b4a] mb-2">Tipo de juros</label>
                    <div className="flex gap-3">
                      {(["composto", "simples"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setConfig((c) => ({ ...c, tipoJuros: t }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            config.tipoJuros === t
                              ? "border-[#2a5595] bg-[#ebf1fb] text-[#2a5595]"
                              : "border-[#ced3d9] text-[#5e6976] hover:border-[#2a5595]"
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#152b4a] mb-2">Taxa anual (%)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="w-full rounded-lg border border-[#ced3d9] bg-[#f4f5f7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5595]"
                      value={config.taxaJurosAnual}
                      onChange={(e) => setConfig((c) => ({ ...c, taxaJurosAnual: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#152b4a] mb-2">Multa</label>
                    <div className="flex gap-3">
                      {[false, true].map((v) => (
                        <button
                          key={String(v)}
                          onClick={() => setConfig((c) => ({ ...c, temMulta: v }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            config.temMulta === v
                              ? "border-[#2a5595] bg-[#ebf1fb] text-[#2a5595]"
                              : "border-[#ced3d9] text-[#5e6976] hover:border-[#2a5595]"
                          }`}
                        >
                          {v ? "Com multa" : "Sem multa"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {config.temMulta && (
                    <div>
                      <label className="block text-sm font-medium text-[#152b4a] mb-2">Valor da multa (%)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        className="w-full rounded-lg border border-[#ced3d9] bg-[#f4f5f7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5595]"
                        value={config.valorMulta}
                        onChange={(e) => setConfig((c) => ({ ...c, valorMulta: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Parcelas */}
              <div className="bg-white rounded-xl border border-[#ced3d9] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="w-4 h-4 text-[#2a5595]" />
                  <h3 className="font-semibold text-[#152b4a]">2. Parcelamento</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#152b4a] mb-2">Número de parcelas</label>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      className="w-full rounded-lg border border-[#ced3d9] bg-[#f4f5f7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5595]"
                      value={config.numeroParcelas}
                      onChange={(e) => setConfig((c) => ({ ...c, numeroParcelas: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#152b4a] mb-2">Valor mínimo por parcela</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5e6976]">R$</span>
                      <input
                        type="number"
                        min={10}
                        step={1}
                        className="w-full rounded-lg border border-[#ced3d9] bg-[#f4f5f7] pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5595]"
                        value={config.valorMinimoParcela}
                        onChange={(e) => setConfig((c) => ({ ...c, valorMinimoParcela: parseFloat(e.target.value) || 10 }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#152b4a] mb-2">Forma de pagamento (para desconto)</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setConfig((c) => ({ ...c, paymentMethod: m }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          config.paymentMethod === m
                            ? "border-[#2a5595] bg-[#ebf1fb] text-[#2a5595]"
                            : "border-[#ced3d9] text-[#5e6976] hover:border-[#2a5595]"
                        }`}
                      >
                        {PAYMENT_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Perfil desconto */}
              <div className="bg-white rounded-xl border border-[#ced3d9] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-[#2a5595]" />
                  <h3 className="font-semibold text-[#152b4a]">3. Perfil de desconto</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(PROFILE_INFO) as Profile[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setConfig((c) => ({ ...c, perfil: p }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        config.perfil === p
                          ? "border-[#2a5595] bg-[#ebf1fb]"
                          : "border-[#ced3d9] bg-[#f4f5f7] hover:border-[#2a5595]"
                      }`}
                    >
                      <p className={`font-semibold text-sm mb-1 ${config.perfil === p ? "text-[#2a5595]" : "text-[#152b4a]"}`}>
                        {PROFILE_INFO[p].label}
                      </p>
                      <p className="text-xs text-[#5e6976] leading-relaxed">{PROFILE_INFO[p].desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCalcular}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-[#2a5595] to-[#77127b] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Calcular prévia →
            </button>
          </div>
        )}

        {/* STEP 3 — Dashboard */}
        {step === 3 && resumo && (
          <Dashboard
            results={results}
            resumo={resumo}
            config={config}
            clientName={clientName}
            onBack={() => setStep(2)}
          />
        )}
      </main>
    </div>
  );
}
