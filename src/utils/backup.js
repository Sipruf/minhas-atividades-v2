// Funções puras para montar e validar o backup { versao, atividades, sessoes }.
// A mesma validação é usada na importação de arquivo e ao ler o localStorage.
// Campos desconhecidos (como "tela", de versões de teste anteriores) são ignorados.

export const VERSAO_BACKUP = 1

const STATUS = ['pendente', 'concluida']
const MAX_ERROS = 10
// ISO com fuso obrigatório (Z ou ±hh:mm), para não depender do fuso de quem importa.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/

const ehIso = (v) => typeof v === 'string' && ISO.test(v) && !Number.isNaN(Date.parse(v))
const ehTextoOpcional = (v) => v === undefined || v === null || typeof v === 'string'
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function copiarAtividade(a) {
  return {
    id: a.id,
    titulo: a.titulo.trim(),
    descricao: a.descricao ?? '',
    status: a.status,
    criadoEm: a.criadoEm,
    concluidoEm: a.status === 'concluida' ? a.concluidoEm : null
  }
}

function copiarSessao(s) {
  return {
    id: s.id,
    atividadeId: s.atividadeId,
    inicio: s.inicio,
    fim: s.fim ?? null,
    nota: s.nota ?? ''
  }
}

export function montarBackup({ atividades, sessoes }) {
  return {
    versao: VERSAO_BACKUP,
    atividades: atividades.map(copiarAtividade),
    sessoes: sessoes.map(copiarSessao)
  }
}

function falha(erros) {
  const lista = erros.slice(0, MAX_ERROS)
  if (erros.length > MAX_ERROS) lista.push(`… e mais ${erros.length - MAX_ERROS} problema(s).`)
  return { ok: false, erros: lista }
}

// Devolve { ok: true, dados } com os dados normalizados ou { ok: false, erros: [...] }.
export function validarBackup(dados, { agora = Date.now(), verificarSobreposicao = true } = {}) {
  if (!ehObjeto(dados)) return falha(['O arquivo não contém um backup válido.'])

  if (dados.versao !== VERSAO_BACKUP) {
    const maisNova = typeof dados.versao === 'number' && dados.versao > VERSAO_BACKUP
    return falha([
      maisNova
        ? `O backup é da versão ${dados.versao}, mais nova que a suportada (${VERSAO_BACKUP}).`
        : 'Versão do backup ausente ou não suportada.'
    ])
  }

  const erros = []
  if (!Array.isArray(dados.atividades)) erros.push('Campo "atividades" ausente ou inválido.')
  if (!Array.isArray(dados.sessoes)) erros.push('Campo "sessoes" ausente ou inválido.')
  if (erros.length) return falha(erros)

  const atividadesPorId = new Map()
  dados.atividades.forEach((a, i) => {
    const ref = `Atividade ${i + 1}`
    if (!ehObjeto(a)) {
      erros.push(`${ref}: formato inválido.`)
      return
    }
    if (typeof a.id !== 'string' || !a.id) erros.push(`${ref}: id ausente.`)
    else if (atividadesPorId.has(a.id)) erros.push(`${ref}: id repetido (${a.id}).`)
    else atividadesPorId.set(a.id, a)
    if (typeof a.titulo !== 'string' || !a.titulo.trim()) erros.push(`${ref}: título ausente.`)
    if (!ehTextoOpcional(a.descricao)) erros.push(`${ref}: descrição inválida.`)
    if (!STATUS.includes(a.status)) erros.push(`${ref}: status inválido.`)
    if (!ehIso(a.criadoEm)) erros.push(`${ref}: data de criação inválida.`)
    if (a.status === 'concluida' && !ehIso(a.concluidoEm)) {
      erros.push(`${ref}: concluída sem data de conclusão válida.`)
    }
    if (a.status === 'pendente' && a.concluidoEm != null) {
      erros.push(`${ref}: pendente com data de conclusão.`)
    }
  })

  const idsSessoes = new Set()
  const intervalos = []
  let abertas = 0
  dados.sessoes.forEach((s, i) => {
    const ref = `Sessão ${i + 1}`
    if (!ehObjeto(s)) {
      erros.push(`${ref}: formato inválido.`)
      return
    }
    if (typeof s.id !== 'string' || !s.id) erros.push(`${ref}: id ausente.`)
    else if (idsSessoes.has(s.id)) erros.push(`${ref}: id repetido (${s.id}).`)
    else idsSessoes.add(s.id)

    const atividade = atividadesPorId.get(s.atividadeId)
    if (!atividade) erros.push(`${ref}: atividade inexistente.`)
    if (!ehTextoOpcional(s.nota)) erros.push(`${ref}: nota inválida.`)

    const inicioOk = ehIso(s.inicio)
    if (!inicioOk) erros.push(`${ref}: início inválido.`)

    if (s.fim === null) {
      abertas += 1
      if (atividade?.status === 'concluida') {
        erros.push(`${ref}: sessão em andamento em atividade concluída.`)
      }
      if (inicioOk) intervalos.push({ inicio: Date.parse(s.inicio), fim: agora })
    } else if (!ehIso(s.fim)) {
      erros.push(`${ref}: fim inválido (use null para sessão em andamento).`)
    } else if (inicioOk && Date.parse(s.fim) <= Date.parse(s.inicio)) {
      erros.push(`${ref}: o fim é anterior ou igual ao início.`)
    } else if (inicioOk) {
      intervalos.push({ inicio: Date.parse(s.inicio), fim: Date.parse(s.fim) })
    }
  })

  if (abertas > 1) erros.push(`Há ${abertas} sessões em andamento; só pode haver uma.`)

  if (verificarSobreposicao) {
    intervalos.sort((a, b) => a.inicio - b.inicio)
    let maiorFim = -Infinity
    let sobrepostas = 0
    for (const intervalo of intervalos) {
      if (intervalo.inicio < maiorFim) sobrepostas += 1
      maiorFim = Math.max(maiorFim, intervalo.fim)
    }
    if (sobrepostas) erros.push(`Há sessões com horários sobrepostos (${sobrepostas}).`)
  }

  if (erros.length) return falha(erros)
  return { ok: true, dados: montarBackup(dados) }
}

// Lê o texto de um arquivo ou do localStorage e valida.
export function interpretarBackup(texto, opcoes) {
  let dados
  try {
    dados = JSON.parse(texto)
  } catch {
    return falha(['O arquivo não é um JSON válido.'])
  }
  return validarBackup(dados, opcoes)
}
