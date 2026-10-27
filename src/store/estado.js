// Store reativo único. As telas leem `estado` e alteram os dados só pelas ações abaixo.
// Ações que podem falhar devolvem { ok: true } ou { ok: false, erro: 'texto' }.

import { computed, reactive, watch } from 'vue'
import { ajustarTempoDoDia, ajustarTempoTotal, sessaoAberta } from '../utils/calculos.js'
import { montarBackup } from '../utils/backup.js'
import { chaveDia } from '../utils/datas.js'
import { carregar, observarOutrasAbas, salvar } from './persistencia.js'

export const LIMITES = { titulo: 100, descricao: 350 }

export const estado = reactive({
  atividades: [],
  sessoes: [],
  // Relógio da tela (ms), atualizado a cada segundo. Não é gravado.
  agora: Date.now(),
  // { texto, tipo: 'info' | 'sucesso' | 'erro' } ou null
  aviso: null
})

export const sessaoAtiva = computed(() => sessaoAberta(estado.sessoes))

export const atividadeAtiva = computed(() => {
  const sessao = sessaoAtiva.value
  return sessao ? (estado.atividades.find((a) => a.id === sessao.atividadeId) ?? null) : null
})

const paraIso = (ms) => new Date(ms).toISOString()
const falha = (erro) => ({ ok: false, erro })
const sucesso = (extra = {}) => ({ ok: true, ...extra })

function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function limparTexto(valor, limite) {
  return String(valor ?? '').trim().slice(0, limite)
}

function buscarAtividade(id) {
  return estado.atividades.find((a) => a.id === id)
}

// Fecha a sessão aberta. Se a duração não for positiva (relógio alterado), descarta a sessão.
function fecharSessaoAberta(ms) {
  const aberta = sessaoAberta(estado.sessoes)
  if (!aberta) return
  if (ms > Date.parse(aberta.inicio)) aberta.fim = paraIso(ms)
  else estado.sessoes = estado.sessoes.filter((s) => s !== aberta)
}

// ---- Atividades ----

export function criarAtividade({ titulo, descricao }) {
  const tituloLimpo = limparTexto(titulo, LIMITES.titulo)
  if (!tituloLimpo) return falha('Informe o título da atividade.')
  const atividade = {
    id: novoId(),
    titulo: tituloLimpo,
    descricao: limparTexto(descricao, LIMITES.descricao),
    status: 'pendente',
    criadoEm: paraIso(Date.now()),
    concluidoEm: null
  }
  estado.atividades.push(atividade)
  return sucesso({ atividade })
}

export function editarAtividade(id, { titulo, descricao }) {
  const atividade = buscarAtividade(id)
  if (!atividade) return falha('Atividade não encontrada.')
  const tituloLimpo = limparTexto(titulo, LIMITES.titulo)
  if (!tituloLimpo) return falha('Informe o título da atividade.')
  atividade.titulo = tituloLimpo
  atividade.descricao = limparTexto(descricao, LIMITES.descricao)
  return sucesso()
}

// Define o tempo total da atividade (ms), ajustando as sessões dela. Ver ajustarTempoTotal.
// O acréscimo nunca começa antes da criação da atividade.
export function ajustarTempoAtividade(id, novoTotalMs) {
  const atividade = buscarAtividade(id)
  if (!atividade) return falha('Atividade não encontrada.')
  const resultado = ajustarTempoTotal(
    id,
    estado.sessoes,
    novoTotalMs,
    Date.now(),
    novoId,
    Date.parse(atividade.criadoEm)
  )
  if (!resultado.ok) return resultado
  estado.sessoes = resultado.sessoes
  return sucesso()
}

// A confirmação é feita na tela, antes de chamar.
export function excluirAtividade(id) {
  estado.sessoes = estado.sessoes.filter((s) => s.atividadeId !== id)
  estado.atividades = estado.atividades.filter((a) => a.id !== id)
}

// ---- Cronômetro ----

// Inicia a atividade; se outra estiver rodando, ela é pausada antes.
export function iniciarAtividade(id) {
  const atividade = buscarAtividade(id)
  if (!atividade) return falha('Atividade não encontrada.')
  if (atividade.status === 'concluida') return falha('Reabra a atividade antes de iniciá-la.')
  if (sessaoAberta(estado.sessoes)?.atividadeId === id) return sucesso()
  const ms = Date.now()
  fecharSessaoAberta(ms)
  estado.sessoes.push({ id: novoId(), atividadeId: id, inicio: paraIso(ms), fim: null, nota: '' })
  estado.agora = ms
  return sucesso()
}

export function pausar() {
  fecharSessaoAberta(Date.now())
}

export function concluirAtividade(id) {
  const atividade = buscarAtividade(id)
  if (!atividade) return falha('Atividade não encontrada.')
  if (atividade.status === 'concluida') return sucesso()
  const ms = Date.now()
  if (sessaoAberta(estado.sessoes)?.atividadeId === id) fecharSessaoAberta(ms)
  atividade.status = 'concluida'
  atividade.concluidoEm = paraIso(ms)
  return sucesso()
}

export function reabrirAtividade(id) {
  const atividade = buscarAtividade(id)
  if (!atividade) return falha('Atividade não encontrada.')
  atividade.status = 'pendente'
  atividade.concluidoEm = null
  return sucesso()
}

// ---- Registros (tempo de uma atividade num dia) ----

// Define o tempo da atividade no dia (AAAA-MM-DD). Ver ajustarTempoDoDia.
export function ajustarTempoNoDia(atividadeId, dia, novoMs) {
  const atividade = buscarAtividade(atividadeId)
  if (!atividade) return falha('Atividade não encontrada.')
  const resultado = ajustarTempoDoDia(
    atividadeId,
    dia,
    estado.sessoes,
    novoMs,
    Date.now(),
    novoId,
    Date.parse(atividade.criadoEm)
  )
  if (!resultado.ok) return resultado
  estado.sessoes = resultado.sessoes
  return sucesso()
}

// Apaga todo o tempo da atividade no dia (inclusive a sessão aberta, se houver).
// A confirmação é feita na tela, antes de chamar.
export function excluirTempoNoDia(atividadeId, dia) {
  estado.sessoes = estado.sessoes.filter(
    (s) => !(s.atividadeId === atividadeId && chaveDia(s.inicio) === dia)
  )
}

// ---- Backup ----

export function dadosParaBackup() {
  return montarBackup(estado)
}

// Recebe dados já validados por validarBackup.
export function substituirDados(dados) {
  estado.atividades = dados.atividades
  estado.sessoes = dados.sessoes
}

// ---- Avisos na tela ----

let temporizadorAviso = null

// duracaoMs = 0 mantém o aviso até a pessoa fechar.
export function mostrarAviso(texto, tipo = 'info', duracaoMs = 4000) {
  clearTimeout(temporizadorAviso)
  estado.aviso = { texto, tipo }
  if (duracaoMs) temporizadorAviso = setTimeout(fecharAviso, duracaoMs)
}

export function fecharAviso() {
  clearTimeout(temporizadorAviso)
  estado.aviso = null
}

// ---- Inicialização ----

let iniciado = false

export function iniciarStore() {
  if (iniciado) return
  iniciado = true

  const { dados, aviso } = carregar()
  substituirDados(dados)
  if (aviso) mostrarAviso(aviso, 'erro', 0)

  watch(
    () => [estado.atividades, estado.sessoes],
    () => {
      const erro = salvar(estado)
      if (erro) mostrarAviso(erro, 'erro', 0)
    },
    { deep: true }
  )

  observarOutrasAbas(substituirDados)

  const atualizarRelogio = () => {
    estado.agora = Date.now()
  }
  setInterval(atualizarRelogio, 1000)
  document.addEventListener('visibilitychange', atualizarRelogio)
}
