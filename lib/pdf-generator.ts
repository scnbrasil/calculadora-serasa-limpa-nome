import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DebtorResult, Config, ResumoCarteira } from "./calculations";
import { formatBRL, formatDate } from "./utils";

const PROFILE_LABEL: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
};

const PAYMENT_LABEL: Record<string, string> = {
  avista: "À vista",
  "2a3": "2x – 3x",
  "4a6": "4x – 6x",
  "7a12": "7x – 12x",
  "13a18": "13x – 18x",
  "19a24": "19x – 24x",
  "25a36": "25x – 36x",
};

export function generatePDF(
  results: DebtorResult[],
  resumo: ResumoCarteira,
  config: Config,
  clientName: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("pt-BR");
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(21, 43, 74); // #152b4a
  doc.rect(0, 0, pageW, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Calculadora Limpa Nome Parceiros — SCN", 10, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${today}`, pageW - 10, 11, { align: "right" });

  // Client
  doc.setTextColor(21, 43, 74);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(clientName ? `Prévia da Oferta — ${clientName}` : "Prévia da Oferta", 10, 28);

  // Config summary
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(94, 105, 118);
  const summary = `Perfil: ${PROFILE_LABEL[config.perfil]}  |  Pagamento: ${PAYMENT_LABEL[config.paymentMethod]}  |  Juros: ${config.tipoJuros} ${config.taxaJurosAnual}% a.a.  |  Parcelas: até ${config.numeroParcelas}x (mín. ${formatBRL(config.valorMinimoParcela)})`;
  doc.text(summary, 10, 33);

  // KPIs
  const kpis = [
    { label: "Devedores", value: String(resumo.totalDevedores) },
    { label: "Dívida original", value: formatBRL(resumo.totalDividaOriginal) },
    { label: "Valor atualizado", value: formatBRL(resumo.totalAtualizado) },
    { label: "Estimativa de recuperação", value: formatBRL(resumo.totalRecuperacao) },
    { label: "Taxa de retorno", value: `${resumo.taxaRecuperacaoMedia.toFixed(1)}%` },
    { label: "Desconto médio", value: `${resumo.descontoMedio.toFixed(1)}%` },
  ];

  const kpiW = (pageW - 20) / kpis.length;
  kpis.forEach((k, i) => {
    const x = 10 + i * kpiW;
    doc.setFillColor(235, 241, 251); // azul-50
    doc.roundedRect(x, 37, kpiW - 2, 16, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(94, 105, 118);
    doc.text(k.label, x + (kpiW - 2) / 2, 43, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(21, 43, 74);
    doc.text(k.value, x + (kpiW - 2) / 2, 49, { align: "center" });
  });

  // Table
  autoTable(doc, {
    startY: 57,
    head: [["Devedor", "Documento", "Vencimento", "Dias", "Faixa", "Valor Original", "Atualizado", "Desconto", "Com Desconto", "Parcelas", "Valor Parcela"]],
    body: results.map((r) => [
      r.nome,
      r.documento,
      formatDate(r.dataVencimento),
      `${r.diasAtraso}d`,
      r.faixaDias,
      formatBRL(r.valorOriginal),
      formatBRL(r.valorAtualizado),
      `-${r.percentualDesconto}%`,
      formatBRL(r.valorComDesconto),
      `${r.parcelasEfetivas}x`,
      formatBRL(r.valorParcela),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [42, 85, 149], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [244, 245, 247] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 28 },
      2: { cellWidth: 20 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 22 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", textColor: [232, 0, 112] },
      8: { halign: "right", textColor: [22, 163, 74] },
      9: { halign: "center" },
      10: { halign: "right", textColor: [42, 85, 149] },
    },
    didDrawPage: (data) => {
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(94, 105, 118);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} — SCN Parceiro Serasa — Documento confidencial`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    },
  });

  const safeName = (clientName || "carteira").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`previa_limpa_nome_${safeName}_${today.replace(/\//g, "-")}.pdf`);
}
