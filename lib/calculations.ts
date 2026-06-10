import { getDiscount, getDaysRange, type Profile, type PaymentMethod } from "./discount-tables";

export interface DebtorInput {
  nome: string;
  documento: string;
  valorOriginal: number;
  dataVencimento: Date;
}

export interface Config {
  tipoJuros: "composto" | "simples";
  taxaJurosAnual: number;
  temMulta: boolean;
  valorMulta: number;
  numeroParcelas: number;
  valorMinimoParcela: number;
  perfil: Profile;
  paymentMethod: PaymentMethod;
}

export interface DebtorResult extends DebtorInput {
  diasAtraso: number;
  faixaDias: string;
  jurosAplicados: number;
  multaAplicada: number;
  valorAtualizado: number;
  percentualDesconto: number;
  valorComDesconto: number;
  valorParcela: number;
  parcelasEfetivas: number;
  recuperacaoLiquida: number;
}

function calcularJuros(
  valorOriginal: number,
  taxaAnual: number,
  diasAtraso: number,
  tipo: "composto" | "simples"
): number {
  if (taxaAnual === 0 || diasAtraso <= 0) return 0;
  const anos = diasAtraso / 365;
  if (tipo === "composto") {
    return valorOriginal * (Math.pow(1 + taxaAnual / 100, anos) - 1);
  } else {
    return valorOriginal * (taxaAnual / 100) * anos;
  }
}

export function calcularDevedor(devedor: DebtorInput, config: Config): DebtorResult {
  const hoje = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - devedor.dataVencimento.getTime()) / msPerDay));

  const jurosAplicados = calcularJuros(devedor.valorOriginal, config.taxaJurosAnual, diasAtraso, config.tipoJuros);
  const multaAplicada = config.temMulta ? devedor.valorOriginal * (config.valorMulta / 100) : 0;
  const valorAtualizado = devedor.valorOriginal + jurosAplicados + multaAplicada;

  const percentualDesconto = getDiscount(config.perfil, diasAtraso, config.paymentMethod);
  const valorComDesconto = valorAtualizado * (1 - percentualDesconto / 100);

  const parcelasMaximas = Math.floor(valorComDesconto / config.valorMinimoParcela);
  const parcelasEfetivas = Math.max(1, Math.min(config.numeroParcelas, parcelasMaximas));
  const valorParcela = valorComDesconto / parcelasEfetivas;

  return {
    ...devedor,
    diasAtraso,
    faixaDias: getDaysRange(diasAtraso),
    jurosAplicados,
    multaAplicada,
    valorAtualizado,
    percentualDesconto,
    valorComDesconto,
    valorParcela,
    parcelasEfetivas,
    recuperacaoLiquida: valorComDesconto,
  };
}

export function calcularCarteira(devedores: DebtorInput[], config: Config): DebtorResult[] {
  return devedores.map((d) => calcularDevedor(d, config));
}

export interface ResumoCarteira {
  totalDevedores: number;
  totalDividaOriginal: number;
  totalAtualizado: number;
  totalRecuperacao: number;
  taxaRecuperacaoMedia: number;
  descontoMedio: number;
}

export function calcularResumo(results: DebtorResult[]): ResumoCarteira {
  const totalDevedores = results.length;
  const totalDividaOriginal = results.reduce((s, r) => s + r.valorOriginal, 0);
  const totalAtualizado = results.reduce((s, r) => s + r.valorAtualizado, 0);
  const totalRecuperacao = results.reduce((s, r) => s + r.recuperacaoLiquida, 0);
  const taxaRecuperacaoMedia = totalDividaOriginal > 0 ? (totalRecuperacao / totalDividaOriginal) * 100 : 0;
  const descontoMedio = results.reduce((s, r) => s + r.percentualDesconto, 0) / (totalDevedores || 1);

  return { totalDevedores, totalDividaOriginal, totalAtualizado, totalRecuperacao, taxaRecuperacaoMedia, descontoMedio };
}
