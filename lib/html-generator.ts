import type { DebtorResult, Config, ResumoCarteira } from "./calculations";
import { getDiscount, type PaymentMethod, type Profile } from "./discount-tables";
import { formatBRL, formatDate } from "./utils";

const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; maxParcelas: number }[] = [
  { method: "avista",  label: "À vista",   maxParcelas: 1  },
  { method: "2a3",     label: "2x – 3x",   maxParcelas: 3  },
  { method: "4a6",     label: "4x – 6x",   maxParcelas: 6  },
  { method: "7a12",    label: "7x – 12x",  maxParcelas: 12 },
  { method: "13a18",   label: "13x – 18x", maxParcelas: 18 },
  { method: "19a24",   label: "19x – 24x", maxParcelas: 24 },
  { method: "25a36",   label: "25x – 36x", maxParcelas: 36 },
];

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
  "0 a 30 dias","31 a 90 dias","91 a 180 dias","181 a 360 dias",
  "361 a 720 dias","721 a 1080 dias","1081 a 1440 dias","1441+ dias",
];
const FAIXAS_SHORT: Record<string, string> = {
  "0 a 30 dias":"0-30d","31 a 90 dias":"31-90d","91 a 180 dias":"91-180d",
  "181 a 360 dias":"181-360d","361 a 720 dias":"361-720d",
  "721 a 1080 dias":"721-1080d","1081 a 1440 dias":"1081-1440d","1441+ dias":"1441+d",
};
const PIE_COLORS = ["#2a5595","#77127b","#e80070","#f08700","#16a34a","#5e6976","#6095d9","#ff61bd"];

function short(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBRL(v);
}

function tip(...lines: string[]): string {
  return lines.join("&#10;").replace(/"/g, "&quot;");
}

function buildBarChart(faixaData: { faixa: string; faixaFull: string; original: number; recuperacao: number }[]): string {
  if (!faixaData.length) return "";
  const W = 700, H = 220, padL = 72, padR = 20, padT = 12, padB = 44;
  const cW = W - padL - padR, cH = H - padT - padB;
  const maxVal = Math.max(...faixaData.map((d) => d.original), 1);
  const scale = (v: number) => (v / maxVal) * cH;
  const grpW = cW / faixaData.length;
  const bW = Math.max(8, grpW * 0.32);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block">`;

  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * i;
    const y = padT + cH - scale(val);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e8eaed" stroke-dasharray="3 3"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#5e6976" font-family="sans-serif">${short(val)}</text>`;
  }

  faixaData.forEach((d, i) => {
    const x = padL + i * grpW;
    const cx = x + grpW / 2;
    const origH = scale(d.original);
    const recH  = scale(d.recuperacao);
    const tipText = tip(`Faixa: ${d.faixaFull}`, `Valor original: ${short(d.original)}`, `Estimativa recuperação: ${short(d.recuperacao)}`);
    svg += `<g style="cursor:pointer" data-tip="${tipText}" onmouseover="showTip(this,event)" onmouseout="hideTip()" onmousemove="moveTip(event)">`;
    svg += `<rect x="${x}" y="${padT}" width="${grpW}" height="${cH + 10}" fill="transparent"/>`;
    svg += `<rect x="${cx - bW - 1}" y="${padT + cH - origH}" width="${bW}" height="${origH}" fill="#e8eaed" rx="3"/>`;
    svg += `<rect x="${cx + 1}"       y="${padT + cH - recH}"  width="${bW}" height="${recH}"  fill="#2a5595" rx="3"/>`;
    svg += `<text x="${cx}" y="${padT + cH + 14}" text-anchor="middle" font-size="9" fill="#5e6976" font-family="sans-serif">${d.faixa}</text>`;
    svg += `</g>`;
  });

  svg += `</svg>`;
  return svg;
}

function buildPieChart(faixaData: { faixa: string; recuperacao: number }[], totalRecuperacao: number): string {
  if (!faixaData.length || !totalRecuperacao) return "";
  const W = 300, H = 200, cx = W / 2, cy = 95, outerR = 78, innerR = 48;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block">`;

  let startAngle = -Math.PI / 2;
  faixaData.forEach((d, i) => {
    const sliceAngle = (d.recuperacao / totalRecuperacao) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle - 0.02;
    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const large = sliceAngle > Math.PI ? 1 : 0;
    const pct = ((d.recuperacao / totalRecuperacao) * 100).toFixed(1);
    const tipText = tip(`Faixa: ${d.faixa}`, `Recuperação: ${short(d.recuperacao)}`, `Participação: ${pct}%`);
    svg += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" fill="${PIE_COLORS[i % PIE_COLORS.length]}" style="cursor:pointer;transition:opacity .15s" data-tip="${tipText}" onmouseover="showTip(this,event);this.style.opacity='.8'" onmouseout="hideTip();this.style.opacity='1'" onmousemove="moveTip(event)"/>`;
    startAngle += sliceAngle;
  });

  svg += `</svg>`;

  const legend = faixaData.map((d, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:4px">
      <span style="display:flex;align-items:center;gap:5px;color:#5e6976">
        <span style="width:10px;height:10px;border-radius:50%;background:${PIE_COLORS[i % PIE_COLORS.length]};flex-shrink:0;display:inline-block"></span>
        ${d.faixa}
      </span>
      <span style="font-weight:500;color:#152b4a">${((d.recuperacao / totalRecuperacao) * 100).toFixed(1)}%</span>
    </div>`).join("");

  return svg + `<div style="margin-top:4px">${legend}</div>`;
}

function buildHorizontalBarChart(faixaData: { faixa: string; devedores: number }[]): string {
  if (!faixaData.length) return "";
  const W = 320, H = 30 * faixaData.length + 20;
  const padL = 64, padR = 36, padT = 10;
  const cW = W - padL - padR;
  const maxVal = Math.max(...faixaData.map((d) => d.devedores), 1);
  const rowH = (H - padT) / faixaData.length;
  const bH = Math.max(10, rowH * 0.55);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block">`;

  faixaData.forEach((d, i) => {
    const y = padT + i * rowH + (rowH - bH) / 2;
    const barW = Math.max(2, (d.devedores / maxVal) * cW);
    const tipText = tip(`Faixa: ${d.faixa}`, `Devedores: ${d.devedores}`);
    svg += `<g style="cursor:pointer" data-tip="${tipText}" onmouseover="showTip(this,event)" onmouseout="hideTip()" onmousemove="moveTip(event)">`;
    svg += `<rect x="${padL}" y="${(y - 2).toFixed(1)}" width="${cW}" height="${(bH + 4).toFixed(1)}" fill="transparent"/>`;
    svg += `<rect x="${padL}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bH}" fill="#77127b" rx="3"/>`;
    svg += `<text x="${padL - 4}" y="${(y + bH / 2 + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#5e6976" font-family="sans-serif">${d.faixa}</text>`;
    svg += `<text x="${(padL + barW + 5).toFixed(1)}" y="${(y + bH / 2 + 4).toFixed(1)}" font-size="9" fill="#152b4a" font-family="sans-serif">${d.devedores}</text>`;
    svg += `</g>`;
  });

  svg += `</svg>`;
  return svg;
}

function buildTop5(results: DebtorResult[], totalOriginal: number): string {
  const top5 = [...results].sort((a, b) => b.valorOriginal - a.valorOriginal).slice(0, 5);
  return top5.map((r, i) => {
    const pct = (r.valorOriginal / totalOriginal) * 100;
    return `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
          <span style="width:20px;height:20px;border-radius:50%;background:#ebf1fb;color:#2a5595;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</span>
          <span style="font-size:12px;font-weight:500;color:#152b4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.nome}</span>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          <div style="font-size:13px;font-weight:700;color:#152b4a">${formatBRL(r.valorOriginal)}</div>
          <div style="font-size:11px;color:#16a34a">recebe ${formatBRL(r.recuperacaoLiquida)}</div>
        </div>
      </div>
      <div style="height:6px;background:#e8eaed;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(to right,#2a5595,#77127b);border-radius:4px"></div>
      </div>
      <div style="font-size:10px;color:#5e6976;margin-top:3px">${pct.toFixed(1)}% da carteira · ${r.diasAtraso} dias atraso · desconto ${r.percentualDesconto}%</div>
    </div>`;
  }).join("");
}

function daysColor(days: number): string {
  if (days > 720) return "#fee2e2;color:#b91c1c";
  if (days > 360) return "#ffedd5;color:#c2410c";
  if (days > 90)  return "#fef9c3;color:#854d0e";
  return "#dcfce7;color:#15803d";
}

function installmentCards(r: DebtorResult, perfil: Profile, valorMinimoParcela: number, selectedMethod: PaymentMethod): string {
  return PAYMENT_OPTIONS.map(({ method, label, maxParcelas }) => {
    const desconto = getDiscount(perfil, r.diasAtraso, method);
    const total = r.valorAtualizado * (1 - desconto / 100);
    const maxP = Math.floor(total / valorMinimoParcela);
    const parcelas = method === "avista" ? 1 : Math.max(1, Math.min(maxParcelas, maxP));
    const parcela = total / parcelas;
    const sel = method === selectedMethod;

    return `
      <div style="border:2px solid ${sel ? "#2a5595" : "#e8eaed"};border-radius:12px;padding:12px;background:#fff;min-width:110px;flex:1">
        <div style="font-size:11px;font-weight:600;color:${sel ? "#2a5595" : "#5e6976"};margin-bottom:8px">
          ${label}${sel ? `<span style="font-size:9px;background:#ebf1fb;color:#2a5595;padding:1px 6px;border-radius:20px;margin-left:4px">selecionado</span>` : ""}
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;color:#5e6976">Desconto</span>
          <span style="font-size:11px;font-weight:700;color:#e80070">-${desconto}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;color:#5e6976">Total</span>
          <span style="font-size:11px;font-weight:600;color:#16a34a">${formatBRL(total)}</span>
        </div>
        ${method !== "avista" ? `<div style="display:flex;justify-content:space-between">
          <span style="font-size:10px;color:#5e6976">${parcelas}x de</span>
          <span style="font-size:11px;font-weight:600;color:#2a5595">${formatBRL(parcela)}</span>
        </div>` : ""}
      </div>`;
  }).join("");
}

export function generateHTML(
  results: DebtorResult[],
  resumo: ResumoCarteira,
  config: Config,
  clientName: string
): void {
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const map: Record<string, { devedores: number; original: number; recuperacao: number }> = {};
  for (const r of results) {
    if (!map[r.faixaDias]) map[r.faixaDias] = { devedores: 0, original: 0, recuperacao: 0 };
    map[r.faixaDias].devedores++;
    map[r.faixaDias].original += r.valorOriginal;
    map[r.faixaDias].recuperacao += r.recuperacaoLiquida;
  }
  const faixaData = FAIXAS_ORDER.filter((f) => map[f]).map((f) => ({
    faixa: FAIXAS_SHORT[f],
    faixaFull: f,
    devedores: map[f].devedores,
    original: map[f].original,
    recuperacao: map[f].recuperacao,
  }));

  const barChart        = buildBarChart(faixaData);
  const pieChart        = buildPieChart(faixaData, resumo.totalRecuperacao);
  const hBarChart       = buildHorizontalBarChart(faixaData);
  const top5Html        = buildTop5(results, resumo.totalDividaOriginal);

  const debtorRows = results.map((r) => {
    const dColor = daysColor(r.diasAtraso);
    const [bg, fg] = dColor.split(";color:");
    return `
    <details class="debtor-row" data-faixa="${r.faixaDias}" style="border-bottom:1px solid #e8eaed">
      <summary style="display:grid;grid-template-columns:180px 130px 90px 70px 110px 100px 90px 110px 80px 110px 70px 110px;gap:0;align-items:center;padding:10px 12px;cursor:pointer;list-style:none;font-size:12px" class="row-summary">
        <span style="font-weight:600;color:#152b4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.nome}">${r.nome}</span>
        <span style="color:#5e6976;font-size:11px">${r.documento}</span>
        <span style="color:#5e6976;font-size:11px;white-space:nowrap">${formatDate(r.dataVencimento)}</span>
        <span><span style="background:${bg};color:${fg};font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px">${r.diasAtraso}d</span></span>
        <span style="color:#5e6976;font-size:11px">${r.faixaDias}</span>
        <span style="text-align:right;color:#152b4a">${formatBRL(r.valorOriginal)}</span>
        <span style="text-align:right;color:#152b4a">${formatBRL(r.valorAtualizado)}</span>
        <span style="text-align:right;color:#e80070;font-weight:600">-${r.percentualDesconto}%</span>
        <span style="text-align:right;color:#16a34a;font-weight:600">${formatBRL(r.valorComDesconto)}</span>
        <span style="text-align:right;color:#5e6976">${r.parcelasEfetivas}x</span>
        <span style="text-align:right;color:#2a5595;font-weight:600">${formatBRL(r.valorParcela)}</span>
        <span style="color:#2a5595;text-align:right;font-size:11px">▸ ver opções</span>
      </summary>
      <div style="padding:12px 16px 16px;background:#f9fafb;border-top:1px solid #e8eaed">
        <p style="font-size:10px;font-weight:600;color:#5e6976;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px">
          Simulação de parcelamento — ${r.faixaDias}
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${installmentCards(r, config.perfil, config.valorMinimoParcela, config.paymentMethod)}
        </div>
      </div>
    </details>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Prévia Serasa Limpa Nome${clientName ? ` — ${clientName}` : ""}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Sora",system-ui,sans-serif;background:#f4f5f7;color:#152b4a;min-width:960px}
  .page{max-width:1200px;margin:0 auto;padding:32px 24px}
  .header{background:linear-gradient(135deg,#152b4a 0%,#2a5595 60%,#77127b 100%);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}
  .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .header .sub{font-size:12px;opacity:.75}
  .badge{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;text-align:right;margin-bottom:6px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}
  .kpi{background:#fff;border:1px solid #ced3d9;border-radius:12px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start}
  .kpi-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .kpi-val{font-size:19px;font-weight:700;color:#152b4a;line-height:1.2}
  .kpi-lbl{font-size:11px;color:#5e6976;margin-bottom:3px}
  .kpi-sub{font-size:11px;color:#5e6976;margin-top:2px}
  .row2{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px}
  .row3{display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:20px}
  .card{background:#fff;border:1px solid #ced3d9;border-radius:12px;padding:20px}
  .card-title{font-size:13px;font-weight:600;color:#152b4a;margin-bottom:4px}
  .card-sub{font-size:11px;color:#5e6976;margin-bottom:16px}
  .legend{display:flex;gap:16px;margin-top:10px;font-size:11px;color:#5e6976;justify-content:center}
  .legend-dot{width:12px;height:12px;border-radius:3px;display:inline-block;margin-right:5px;vertical-align:middle}
  .row-summary::-webkit-details-marker{display:none}
  .row-summary:hover{background:#f4f5f7}
  details[open] .row-summary{background:#ebf1fb}
  .table-header{display:grid;grid-template-columns:180px 130px 90px 70px 110px 100px 90px 110px 80px 110px 70px 110px;gap:0;padding:10px 12px;background:#f4f5f7;border-bottom:1px solid #ced3d9;font-size:11px;font-weight:600;color:#5e6976}
  .footer{text-align:center;font-size:11px;color:#5e6976;margin-top:32px;padding-top:16px;border-top:1px solid #e8eaed}
  #svg-tooltip{position:fixed;background:#fff;border:1px solid #ced3d9;border-radius:8px;padding:8px 12px;font-size:12px;color:#152b4a;pointer-events:none;display:none;z-index:999;box-shadow:0 2px 10px rgba(0,0,0,.12);white-space:pre;line-height:1.6;font-family:"Sora",system-ui,sans-serif}
</style>
</head>
<body>
<div id="svg-tooltip"></div>
<div class="page">

  <div class="header">
    <div>
      <div style="font-size:11px;font-weight:600;opacity:.6;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Serasa Limpa Nome Parceiros</div>
      <h1>${clientName ? `Prévia de Oferta — ${clientName}` : "Prévia de Oferta"}</h1>
      <div class="sub">Gerado em ${today}</div>
    </div>
    <div>
      <div class="badge">Perfil: ${PROFILE_LABEL[config.perfil]}</div>
      <div class="badge">Pagamento: ${PAYMENT_LABEL[config.paymentMethod]}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-icon" style="background:#ebf1fb;color:#2a5595">👥</div>
      <div>
        <div class="kpi-lbl">Total de devedores</div>
        <div class="kpi-val">${resumo.totalDevedores}</div>
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-icon" style="background:#fff8ec;color:#f08700">💰</div>
      <div>
        <div class="kpi-lbl">Dívida original total</div>
        <div class="kpi-val">${formatBRL(resumo.totalDividaOriginal)}</div>
      </div>
    </div>
    <div class="kpi">
      <div class="kpi-icon" style="background:#dcfce7;color:#16a34a">📈</div>
      <div>
        <div class="kpi-lbl">Estimativa de recuperação</div>
        <div class="kpi-val" style="color:#16a34a">${formatBRL(resumo.totalRecuperacao)}</div>
        <div class="kpi-sub">${resumo.taxaRecuperacaoMedia.toFixed(1)}% sobre o valor original</div>
      </div>
    </div>
  </div>

  <!-- Linha 1: gráfico de barras + pizza -->
  <div class="row2">
    <div class="card">
      <div class="card-title">Recuperação estimada por faixa de atraso</div>
      <div class="card-sub">Comparativo entre valor original e valor a receber após desconto</div>
      ${barChart}
      <div class="legend">
        <span><span class="legend-dot" style="background:#e8eaed"></span>Valor original</span>
        <span><span class="legend-dot" style="background:#2a5595"></span>Estimativa recuperação</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Distribuição por faixa</div>
      <div class="card-sub">Recuperação (%) por tempo de atraso</div>
      ${pieChart}
    </div>
  </div>

  <!-- Linha 2: barras horizontais + top 5 -->
  <div class="row3">
    <div class="card">
      <div class="card-title">Devedores por faixa</div>
      <div class="card-sub">Quantidade de devedores em cada faixa de atraso</div>
      ${hBarChart}
    </div>
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;gap:6px">
        <span style="color:#2a5595">🏷</span> Top 5 maiores dívidas
      </div>
      <div style="margin-bottom:16px"></div>
      ${top5Html}
    </div>
  </div>

  <!-- Tabela completa -->
  <div class="card" style="padding:0;overflow:hidden;margin-bottom:0">
    <div style="padding:16px 20px;border-bottom:1px solid #ced3d9">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="card-title">Detalhamento completo da carteira</div>
          <div class="card-sub" style="margin-bottom:0" id="table-subtitle">${results.length} devedores · clique em cada linha para ver todas as opções de parcelamento</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button id="btn-prev" onclick="changePage(-1)" style="padding:6px 14px;border:1px solid #ced3d9;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit">← Anterior</button>
          <span id="page-info" style="font-size:12px;color:#5e6976;white-space:nowrap"></span>
          <button id="btn-next" onclick="changePage(1)" style="padding:6px 14px;border:1px solid #ced3d9;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit">Próxima →</button>
        </div>
      </div>
      <!-- Filtro de faixa interativo -->
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
        <span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#5e6976">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Faixa de atraso:
        </span>
        ${faixaData.map((f) => `<button class="faixa-btn" data-faixa="${f.faixaFull}" onclick="toggleFaixa(this)" style="padding:4px 12px;border-radius:20px;border:1px solid #ced3d9;background:#fff;color:#5e6976;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s">${f.faixaFull}</button>`).join("")}
        <button id="btn-clear-filter" onclick="clearFilter()" style="display:none;padding:4px 12px;border-radius:20px;border:1px solid #e80070;background:#fff;color:#e80070;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit">Limpar filtro</button>
      </div>
    </div>
    <div style="overflow-x:auto">
      <div class="table-header">
        <span>Devedor</span><span>Documento</span><span>Vencimento</span><span>Atraso</span>
        <span>Faixa</span><span style="text-align:right">Original</span><span style="text-align:right">Atualizado</span>
        <span style="text-align:right">Desconto</span><span style="text-align:right">Com desconto</span>
        <span style="text-align:right">Parcelas</span><span style="text-align:right">Vl. parcela</span>
        <span></span>
      </div>
      <div id="debtor-table">
        ${debtorRows}
      </div>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #e8eaed;display:flex;justify-content:center;gap:8px;align-items:center">
      <button id="btn-prev2" onclick="changePage(-1)" style="padding:6px 14px;border:1px solid #ced3d9;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit">← Anterior</button>
      <span id="page-info2" style="font-size:12px;color:#5e6976;white-space:nowrap"></span>
      <button id="btn-next2" onclick="changePage(1)" style="padding:6px 14px;border:1px solid #ced3d9;border-radius:8px;background:#fff;font-size:12px;cursor:pointer;font-family:inherit">Próxima →</button>
    </div>
  </div>

  <div class="footer">
    SCN Brasil · Serasa Limpa Nome Parceiros · Documento gerado em ${today}<br/>
    Este documento é uma prévia de simulação e não constitui proposta formal de negociação.
  </div>

</div>
<script>
  var _tt = document.getElementById('svg-tooltip');
  function showTip(el, event) {
    var lines = el.dataset.tip.split('\n');
    _tt.innerHTML = '<strong style="color:#152b4a">' + lines[0] + '</strong>' +
      lines.slice(1).map(function(l){ return '<br/><span style="color:#5e6976">' + l + '</span>'; }).join('');
    _tt.style.display = 'block';
    moveTip(event);
  }
  function moveTip(event) {
    var x = event.clientX + 14, y = event.clientY + 14;
    if (x + 200 > window.innerWidth) x = event.clientX - 210;
    if (y + 80 > window.innerHeight) y = event.clientY - 80;
    _tt.style.left = x + 'px';
    _tt.style.top  = y + 'px';
  }
  function hideTip() { _tt.style.display = 'none'; }

  var PER_PAGE = 20;
  var currentPage = 1;
  var activeFaixas = [];

  function allRows() { return Array.from(document.querySelectorAll('.debtor-row')); }

  function visibleRows() {
    return allRows().filter(function(r) {
      return activeFaixas.length === 0 || activeFaixas.indexOf(r.dataset.faixa) !== -1;
    });
  }

  function render() {
    var all = allRows();
    var visible = visibleRows();
    var total = visible.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (currentPage > pages) currentPage = pages;

    // hide all, then show only current page of visible
    all.forEach(function(r) { r.style.display = 'none'; });
    visible.forEach(function(r, i) {
      if (i >= (currentPage - 1) * PER_PAGE && i < currentPage * PER_PAGE) {
        r.style.display = 'block';
      }
    });

    var info = 'Página ' + currentPage + ' de ' + pages + ' · ' + total + ' de ${results.length} devedores';
    document.getElementById('page-info').textContent = info;
    document.getElementById('page-info2').textContent = info;
    document.getElementById('table-subtitle').textContent = total + ' de ${results.length} devedores · clique em cada linha para ver todas as opções de parcelamento';

    var atFirst = currentPage === 1;
    var atLast  = currentPage === pages;
    ['btn-prev','btn-prev2'].forEach(function(id){ document.getElementById(id).disabled = atFirst; });
    ['btn-next','btn-next2'].forEach(function(id){ document.getElementById(id).disabled = atLast; });
  }

  function changePage(dir) {
    var pages = Math.max(1, Math.ceil(visibleRows().length / PER_PAGE));
    currentPage = Math.max(1, Math.min(pages, currentPage + dir));
    document.getElementById('debtor-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
    render();
  }

  function toggleFaixa(btn) {
    var faixa = btn.dataset.faixa;
    var idx = activeFaixas.indexOf(faixa);
    if (idx === -1) {
      activeFaixas.push(faixa);
      btn.style.background = '#2a5595';
      btn.style.color = '#fff';
      btn.style.borderColor = '#2a5595';
    } else {
      activeFaixas.splice(idx, 1);
      btn.style.background = '#fff';
      btn.style.color = '#5e6976';
      btn.style.borderColor = '#ced3d9';
    }
    document.getElementById('btn-clear-filter').style.display = activeFaixas.length ? 'inline-block' : 'none';
    currentPage = 1;
    render();
  }

  function clearFilter() {
    activeFaixas = [];
    document.querySelectorAll('.faixa-btn').forEach(function(b) {
      b.style.background = '#fff';
      b.style.color = '#5e6976';
      b.style.borderColor = '#ced3d9';
    });
    document.getElementById('btn-clear-filter').style.display = 'none';
    currentPage = 1;
    render();
  }

  render();
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const slug = clientName ? clientName.toLowerCase().replace(/\s+/g, "-") : "carteira";
  a.download = `previa-limpa-nome-${slug}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
