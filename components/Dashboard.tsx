"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Users, DollarSign, Percent, Download, ArrowLeft, Tag } from "lucide-react";
import type { DebtorResult, Config, ResumoCarteira } from "@/lib/calculations";
import { formatBRL } from "@/lib/utils";
import ResultsTable from "./ResultsTable";
import { generatePDF } from "@/lib/pdf-generator";
import type { Profile, PaymentMethod } from "@/lib/discount-tables";

const PROFILE_LABEL: Record<Profile, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  avista: "À vista", "2a3": "2x–3x", "4a6": "4x–6x",
  "7a12": "7x–12x", "13a18": "13x–18x", "19a24": "19x–24x", "25a36": "25x–36x",
};

const FAIXAS_ORDER = [
  "0 a 30 dias", "31 a 90 dias", "91 a 180 dias", "181 a 360 dias",
  "361 a 720 dias", "721 a 1080 dias", "1081 a 1440 dias", "1441+ dias",
];
const FAIXAS_SHORT: Record<string, string> = {
  "0 a 30 dias": "0-30d", "31 a 90 dias": "31-90d", "91 a 180 dias": "91-180d",
  "181 a 360 dias": "181-360d", "361 a 720 dias": "361-720d",
  "721 a 1080 dias": "721-1080d", "1081 a 1440 dias": "1081-1440d", "1441+ dias": "1441+d",
};

const PIE_COLORS = ["#2a5595", "#77127b", "#e80070", "#f08700", "#16a34a", "#5e6976", "#6095d9", "#ff61bd"];

interface Props {
  results: DebtorResult[];
  resumo: ResumoCarteira;
  config: Config;
  clientName: string;
  onBack: () => void;
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#ced3d9] p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[#5e6976] mb-0.5">{label}</p>
        <p className="text-xl font-bold text-[#152b4a] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[#5e6976] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const currencyFormatter = (v: number) =>
  v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : formatBRL(v);

export default function Dashboard({ results, resumo, config, clientName, onBack }: Props) {
  const faixaData = useMemo(() => {
    const map: Record<string, { devedores: number; original: number; recuperacao: number }> = {};
    for (const r of results) {
      if (!map[r.faixaDias]) map[r.faixaDias] = { devedores: 0, original: 0, recuperacao: 0 };
      map[r.faixaDias].devedores += 1;
      map[r.faixaDias].original += r.valorOriginal;
      map[r.faixaDias].recuperacao += r.recuperacaoLiquida;
    }
    return FAIXAS_ORDER.filter((f) => map[f]).map((f) => ({
      faixa: FAIXAS_SHORT[f],
      faixaFull: f,
      devedores: map[f].devedores,
      original: map[f].original,
      recuperacao: map[f].recuperacao,
    }));
  }, [results]);

  const pieData = useMemo(() =>
    faixaData.map((f) => ({ name: f.faixa, value: f.recuperacao })),
    [faixaData]
  );

  const topDevedores = useMemo(() =>
    [...results].sort((a, b) => b.valorOriginal - a.valorOriginal).slice(0, 5),
    [results]
  );

  const handleDownload = () => generatePDF(results, resumo, config, clientName);

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={onBack} className="text-[#5e6976] hover:text-[#2a5595] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold text-[#152b4a]">
              {clientName ? `Prévia — ${clientName}` : "Prévia da Oferta"}
            </h2>
          </div>
          <p className="text-xs text-[#5e6976] ml-6">
            Gerado em {today} · Perfil{" "}
            <span className="font-semibold text-[#2a5595]">{PROFILE_LABEL[config.perfil]}</span> ·{" "}
            Pagamento <span className="font-semibold text-[#2a5595]">{PAYMENT_LABEL[config.paymentMethod]}</span>
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2a5595] to-[#77127b] text-white text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
        >
          <Download className="w-4 h-4" />
          Baixar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total de devedores" value={String(resumo.totalDevedores)} color="bg-[#ebf1fb] text-[#2a5595]" />
        <KpiCard icon={DollarSign} label="Dívida original total" value={formatBRL(resumo.totalDividaOriginal)} color="bg-[#fff8ec] text-[#f08700]" />
        <KpiCard
          icon={TrendingUp}
          label="Estimativa de recuperação"
          value={formatBRL(resumo.totalRecuperacao)}
          sub={`${resumo.taxaRecuperacaoMedia.toFixed(1)}% sobre o valor original`}
          color="bg-[#dcfce7] text-[#16a34a]"
        />
        <KpiCard
          icon={Percent}
          label="Desconto médio aplicado"
          value={`${resumo.descontoMedio.toFixed(1)}%`}
          sub={`${formatBRL(resumo.totalAtualizado - resumo.totalRecuperacao)} descontados`}
          color="bg-[#ffecf5] text-[#e80070]"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart — recuperação por faixa */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#ced3d9] p-5">
          <p className="text-sm font-semibold text-[#152b4a] mb-1">Recuperação estimada por faixa de atraso</p>
          <p className="text-xs text-[#5e6976] mb-4">Comparativo entre valor original e valor a receber após desconto</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={faixaData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" vertical={false} />
              <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: "#5e6976" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 10, fill: "#5e6976" }} axisLine={false} tickLine={false} width={65} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [formatBRL(Number(value)), name === "original" ? "Valor original" : "Estimativa recuperação"]}
                labelFormatter={(l) => `Faixa: ${l}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #ced3d9" }}
              />
              <Bar dataKey="original" name="original" fill="#e8eaed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recuperacao" name="recuperacao" fill="#2a5595" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-[#5e6976]"><span className="w-3 h-3 rounded-sm bg-[#e8eaed] inline-block" />Valor original</span>
            <span className="flex items-center gap-1.5 text-xs text-[#5e6976]"><span className="w-3 h-3 rounded-sm bg-[#2a5595] inline-block" />Estimativa recuperação</span>
          </div>
        </div>

        {/* Pie chart — distribuição */}
        <div className="bg-white rounded-xl border border-[#ced3d9] p-5">
          <p className="text-sm font-semibold text-[#152b4a] mb-1">Distribuição por faixa</p>
          <p className="text-xs text-[#5e6976] mb-2">Recuperação (%) por tempo de atraso</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => formatBRL(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #ced3d9" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#5e6976]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="font-medium text-[#152b4a]">{((d.value / resumo.totalRecuperacao) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart — devedores por faixa */}
        <div className="bg-white rounded-xl border border-[#ced3d9] p-5">
          <p className="text-sm font-semibold text-[#152b4a] mb-1">Devedores por faixa</p>
          <p className="text-xs text-[#5e6976] mb-4">Quantidade de devedores em cada faixa de atraso</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={faixaData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#5e6976" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="faixa" type="category" tick={{ fontSize: 10, fill: "#5e6976" }} axisLine={false} tickLine={false} width={55} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(v: any) => [`${v} devedores`]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #ced3d9" }} />
              <Bar dataKey="devedores" fill="#77127b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 devedores */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#ced3d9] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-[#2a5595]" />
            <p className="text-sm font-semibold text-[#152b4a]">Top 5 maiores dívidas</p>
          </div>
          <div className="space-y-3">
            {topDevedores.map((r, i) => {
              const pct = (r.valorOriginal / resumo.totalDividaOriginal) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#ebf1fb] text-[#2a5595] text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-[#152b4a] truncate">{r.nome}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-[#152b4a]">{formatBRL(r.valorOriginal)}</p>
                      <p className="text-xs text-[#16a34a]">recebe {formatBRL(r.recuperacaoLiquida)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#e8eaed] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#2a5595] to-[#77127b] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-[#5e6976] mt-0.5">{pct.toFixed(1)}% da carteira · {r.diasAtraso} dias atraso · desconto {r.percentualDesconto}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#152b4a]">Detalhamento completo da carteira</p>
          <p className="text-xs text-[#5e6976]">{results.length} devedores · clique nos cabeçalhos para ordenar</p>
        </div>
        <ResultsTable results={results} config={config} />
      </div>
    </div>
  );
}
