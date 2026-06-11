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

function short(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBRL(v);
}

function buildBarChart(faixaData: { faixa: string; original: number; recuperacao: number }[]): string {
  if (!faixaData.length) return "";
  const W = 700, H = 220, padL = 72, padR = 20, padT = 12, padB = 44;
  const cW = W - padL - padR, cH = H - padT - padB;
  const maxVal = Math.max(...faixaData.map((d) => d.original), 1);
  const scale = (v: number) => (v / maxVal) * cH;
  const grpW = cW / faixaData.length;
  const bW = Math.max(8, grpW * 0.32);

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block">`;

  // grid lines + y labels
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
    svg += `<rect x="${cx - bW - 1}" y="${padT + cH - origH}" width="${bW}" height="${origH}" fill="#e8eaed" rx="3"/>`;
    svg += `<rect x="${cx + 1}"       y="${padT + cH - recH}"  width="${bW}" height="${recH}"  fill="#2a5595" rx="3"/>`;
    svg += `<text x="${cx}" y="${padT + cH + 14}" text-anchor="middle" font-size="9" fill="#5e6976" font-family="sans-serif">${d.faixa}</text>`;
  });

  svg += `</svg>`;
  return svg;
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

  // faixa aggregation
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

  const barChart = buildBarChart(faixaData);

  const debtorRows = results.map((r) => {
    const dColor = daysColor(r.diasAtraso);
    const [bg, fg] = dColor.split(";color:");
    return `
    <details style="border-bottom:1px solid #e8eaed">
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

  const faixaRows = faixaData.map((f) => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#152b4a">${f.faixaFull}</td>
      <td style="padding:8px 12px;font-size:12px;color:#5e6976;text-align:center">${f.devedores}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right">${formatBRL(f.original)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#16a34a;font-weight:600">${formatBRL(f.recuperacao)}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;color:#e80070">
        ${((f.recuperacao / f.original) * 100).toFixed(1)}%
      </td>
    </tr>`).join("");

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
  body{font-family:"Sora",system-ui,sans-serif;background:#f4f5f7;color:#152b4a;min-width:900px}
  .page{max-width:1200px;margin:0 auto;padding:32px 24px}
  .header{background:linear-gradient(135deg,#152b4a 0%,#2a5595 60%,#77127b 100%);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}
  .header h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .header .sub{font-size:12px;opacity:.75}
  .badge{background:rgba(255,255,255,.15);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;text-align:right}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  .kpi{background:#fff;border:1px solid #ced3d9;border-radius:12px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start}
  .kpi-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
  .kpi-val{font-size:19px;font-weight:700;color:#152b4a;line-height:1.2}
  .kpi-lbl{font-size:11px;color:#5e6976;margin-bottom:3px}
  .kpi-sub{font-size:11px;color:#5e6976;margin-top:2px}
  .card{background:#fff;border:1px solid #ced3d9;border-radius:12px;padding:20px;margin-bottom:20px}
  .card-title{font-size:13px;font-weight:600;color:#152b4a;margin-bottom:4px}
  .card-sub{font-size:11px;color:#5e6976;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#f4f5f7;border-bottom:1px solid #ced3d9}
  thead th{padding:10px 12px;font-size:11px;font-weight:600;color:#5e6976;text-align:left;white-space:nowrap}
  .row-summary::-webkit-details-marker{display:none}
  .row-summary:hover{background:#f4f5f7}
  details[open] .row-summary{background:#ebf1fb}
  .legend{display:flex;gap:16px;margin-top:10px;font-size:11px;color:#5e6976;justify-content:center}
  .legend-dot{width:12px;height:12px;border-radius:3px;display:inline-block;margin-right:5px;vertical-align:middle}
  .table-header{display:grid;grid-template-columns:180px 130px 90px 70px 110px 100px 90px 110px 80px 110px 70px 110px;gap:0;padding:10px 12px;background:#f4f5f7;border-bottom:1px solid #ced3d9;font-size:11px;font-weight:600;color:#5e6976}
  .footer{text-align:center;font-size:11px;color:#5e6976;margin-top:32px;padding-top:16px;border-top:1px solid #e8eaed}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div style="font-size:11px;font-weight:600;opacity:.6;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Serasa Limpa Nome Parceiros</div>
      <h1>${clientName ? `Prévia de Oferta — ${clientName}` : "Prévia de Oferta"}</h1>
      <div class="sub">Gerado em ${today}</div>
    </div>
    <div>
      <div class="badge" style="margin-bottom:6px">Perfil: ${PROFILE_LABEL[config.perfil]}</div>
      <div class="badge">Pagamento: ${PAYMENT_LABEL[config.paymentMethod]}</div>
    </div>
  </div>

  <!-- KPIs -->
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
    <div class="kpi">
      <div class="kpi-icon" style="background:#ffecf5;color:#e80070">%</div>
      <div>
        <div class="kpi-lbl">Desconto médio aplicado</div>
        <div class="kpi-val" style="color:#e80070">${resumo.descontoMedio.toFixed(1)}%</div>
        <div class="kpi-sub">${formatBRL(resumo.totalAtualizado - resumo.totalRecuperacao)} descontados</div>
      </div>
    </div>
  </div>

  <!-- Bar chart + Faixa table -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px">
    <div class="card">
      <div class="card-title">Recuperação estimada por faixa de atraso</div>
      <div class="card-sub">Comparativo entre valor original e valor a receber após desconto</div>
      ${barChart}
      <div class="legend">
        <span><span class="legend-dot" style="background:#e8eaed"></span>Valor original</span>
        <span><span class="legend-dot" style="background:#2a5595"></span>Estimativa recuperação</span>
      </div>
    </div>
    <div class="card" style="overflow:auto">
      <div class="card-title">Resumo por faixa</div>
      <div class="card-sub">Valor e devedores por tempo de atraso</div>
      <table>
        <thead>
          <tr>
            <th>Faixa</th>
            <th style="text-align:center">Qtd</th>
            <th style="text-align:right">Original</th>
            <th style="text-align:right">Recuperação</th>
            <th style="text-align:right">%</th>
          </tr>
        </thead>
        <tbody style="font-size:12px">
          ${faixaRows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Debtors table -->
  <div class="card" style="padding:0;overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #ced3d9;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="card-title">Detalhamento completo da carteira</div>
        <div class="card-sub" style="margin-bottom:0">${results.length} devedores · clique em cada linha para ver todas as opções de parcelamento</div>
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
      ${debtorRows}
    </div>
  </div>

  <div class="footer">
    SCN Brasil · Serasa Limpa Nome Parceiros · Documento gerado em ${today}<br/>
    Este documento é uma prévia de simulação e não constitui proposta formal de negociação.
  </div>

</div>
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
