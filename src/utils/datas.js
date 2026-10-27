// Funções puras de data no fuso America/Sao_Paulo.
// "Chave de dia" é o texto AAAA-MM-DD do dia nesse fuso.
// Instantes são guardados em ISO (UTC) e aceitos como ISO, Date ou milissegundos.

export const FUSO = 'America/Sao_Paulo'

const NOMES_DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const NOMES_DIAS_LONGOS = [
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
  'domingo'
]

const formatadorPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
})

const doisDigitos = (n) => String(n).padStart(2, '0')

export function paraMs(valor) {
  if (valor instanceof Date) return valor.getTime()
  if (typeof valor === 'number') return valor
  if (typeof valor === 'string') return Date.parse(valor)
  return NaN
}

// Data e hora "de parede" em São Paulo para um instante.
function partes(valor) {
  const p = {}
  for (const { type, value } of formatadorPartes.formatToParts(new Date(paraMs(valor)))) {
    if (type !== 'literal') p[type] = Number(value)
  }
  return {
    ano: p.year,
    mes: p.month,
    dia: p.day,
    hora: p.hour % 24,
    minuto: p.minute,
    segundo: p.second
  }
}

function deslocamentoMs(ms) {
  const p = partes(ms)
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo)
  return comoUtc - Math.floor(ms / 1000) * 1000
}

// Instante (ms) correspondente a uma data e hora de parede em São Paulo.
function msNoFuso(ano, mes, dia, hora = 0, minuto = 0) {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto)
  const primeiro = palpite - deslocamentoMs(palpite)
  return palpite - deslocamentoMs(primeiro)
}

function lerChave(chave) {
  const [ano, mes, dia] = chave.split('-').map(Number)
  return { ano, mes, dia }
}

export function chaveDia(valor) {
  const p = partes(valor)
  return `${p.ano}-${doisDigitos(p.mes)}-${doisDigitos(p.dia)}`
}

// Instante (ms) da meia-noite do dia em São Paulo.
export function inicioDoDia(chave) {
  const { ano, mes, dia } = lerChave(chave)
  return msNoFuso(ano, mes, dia)
}

export function somarDias(chave, n) {
  const { ano, mes, dia } = lerChave(chave)
  return new Date(Date.UTC(ano, mes - 1, dia + n)).toISOString().slice(0, 10)
}

// 0 = segunda ... 6 = domingo
export function diaDaSemana(chave) {
  const { ano, mes, dia } = lerChave(chave)
  return (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() + 6) % 7
}

// Semana útil (segunda a sexta) que contém o instante. Sábado e domingo são desconsiderados:
// pertencem à semana que acabou de terminar, mas não entram nos dias nem no intervalo.
export function semanaDe(valor) {
  const dia = chaveDia(valor)
  const inicio = somarDias(dia, -diaDaSemana(dia))
  const dias = Array.from({ length: 5 }, (_, i) => somarDias(inicio, i))
  return { inicio, fim: dias[4], dias }
}

export function deslocarSemana(semana, n) {
  return semanaDe(inicioDoDia(somarDias(semana.inicio, 7 * n)))
}

// Intervalos em ms, com início incluído e fim excluído.
export function intervaloDoDia(chave) {
  return { inicio: inicioDoDia(chave), fim: inicioDoDia(somarDias(chave, 1)) }
}

export function intervaloDaSemana(semana) {
  return { inicio: inicioDoDia(semana.inicio), fim: inicioDoDia(somarDias(semana.fim, 1)) }
}

export function formatarData(chave) {
  const { ano, mes, dia } = lerChave(chave)
  return `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`
}

export function formatarDiaMes(chave) {
  const { mes, dia } = lerChave(chave)
  return `${doisDigitos(dia)}/${doisDigitos(mes)}`
}

// "19/10 a 23/10/2026" ou, na virada do ano, "28/12/2026 a 01/01/2027".
export function rotuloSemana(semana) {
  const mesmoAno = lerChave(semana.inicio).ano === lerChave(semana.fim).ano
  const inicio = mesmoAno ? formatarDiaMes(semana.inicio) : formatarData(semana.inicio)
  return `${inicio} a ${formatarData(semana.fim)}`
}

export function nomeDiaSemana(chave, longo = false) {
  return (longo ? NOMES_DIAS_LONGOS : NOMES_DIAS)[diaDaSemana(chave)]
}

export function formatarHora(valor) {
  const p = partes(valor)
  return `${doisDigitos(p.hora)}:${doisDigitos(p.minuto)}`
}

export function formatarDataHora(valor) {
  return `${formatarData(chaveDia(valor))} ${formatarHora(valor)}`
}
