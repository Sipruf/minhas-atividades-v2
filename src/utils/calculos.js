// Funções puras de cálculo de tempo. Nada aqui lê o relógio: "agora" é sempre parâmetro.
// Intervalos são { inicio, fim } em ms, com início incluído e fim excluído.

import { chaveDia, formatarDataHora, intervaloDoDia, paraMs } from './datas.js'

// Fim real da sessão; sessão aberta (fim null) termina "agora".
export function fimEfetivo(sessao, agora) {
  return sessao.fim === null ? agora : paraMs(sessao.fim)
}

export function duracaoMs(sessao, agora) {
  return Math.max(0, fimEfetivo(sessao, agora) - paraMs(sessao.inicio))
}

export function duracaoNoIntervalo(sessao, intervalo, agora) {
  const inicio = Math.max(paraMs(sessao.inicio), intervalo.inicio)
  const fim = Math.min(fimEfetivo(sessao, agora), intervalo.fim)
  return Math.max(0, fim - inicio)
}

export function sessaoAberta(sessoes) {
  return sessoes.find((s) => s.fim === null) ?? null
}

// Id da atividade da sessão encerrada mais recentemente (a "pausada"), ou null.
export function atividadeDaUltimaSessao(sessoes) {
  let ultima = null
  for (const sessao of sessoes) {
    if (sessao.fim === null) continue
    if (!ultima || paraMs(sessao.fim) > paraMs(ultima.fim)) ultima = sessao
  }
  return ultima?.atividadeId ?? null
}

export function totalAtividade(atividadeId, sessoes, agora) {
  return sessoes.reduce(
    (total, s) => (s.atividadeId === atividadeId ? total + duracaoMs(s, agora) : total),
    0
  )
}

// Map atividadeId -> ms total, numa única passada pelas sessões.
export function totaisPorAtividade(sessoes, agora) {
  const totais = new Map()
  for (const s of sessoes) {
    totais.set(s.atividadeId, (totais.get(s.atividadeId) ?? 0) + duracaoMs(s, agora))
  }
  return totais
}

export function totalNoIntervalo(sessoes, intervalo, agora) {
  return sessoes.reduce((total, s) => total + duracaoNoIntervalo(s, intervalo, agora), 0)
}

// Um registro por atividade por dia, para as sessões que começam no intervalo.
// [{ chave, dia, atividadeId, inicio, fim, ms }]: inicio é o da primeira sessão do dia, fim o da
// última (null se ainda está aberta) e ms a soma das sessões. Ordem: dia mais recente primeiro;
// dentro do dia, pela primeira sessão.
export function registrosDoIntervalo(sessoes, intervalo, agora) {
  const registros = new Map()
  const doIntervalo = sessoes
    .filter((s) => {
      const inicio = paraMs(s.inicio)
      return inicio >= intervalo.inicio && inicio < intervalo.fim
    })
    .sort((a, b) => paraMs(a.inicio) - paraMs(b.inicio))
  for (const sessao of doIntervalo) {
    const dia = chaveDia(sessao.inicio)
    const chave = `${dia}|${sessao.atividadeId}`
    let registro = registros.get(chave)
    if (!registro) {
      registro = { chave, dia, atividadeId: sessao.atividadeId, inicio: sessao.inicio, fim: null, ms: 0 }
      registros.set(chave, registro)
    }
    registro.fim = sessao.fim
    registro.ms += duracaoMs(sessao, agora)
  }
  return [...registros.values()].sort(
    (a, b) => b.dia.localeCompare(a.dia) || paraMs(a.inicio) - paraMs(b.inicio)
  )
}

// { 'AAAA-MM-DD': ms } para cada dia pedido. Sessões que passam da meia-noite são divididas.
export function somaPorDia(sessoes, dias, agora) {
  const resultado = {}
  for (const dia of dias) {
    resultado[dia] = totalNoIntervalo(sessoes, intervaloDoDia(dia), agora)
  }
  return resultado
}

// [{ atividade, ms }] só com quem teve tempo no intervalo, do maior para o menor.
export function horasPorAtividade(atividades, sessoes, intervalo, agora) {
  const porId = new Map()
  for (const s of sessoes) {
    const ms = duracaoNoIntervalo(s, intervalo, agora)
    if (ms > 0) porId.set(s.atividadeId, (porId.get(s.atividadeId) ?? 0) + ms)
  }
  return atividades
    .filter((a) => porId.has(a.id))
    .map((atividade) => ({ atividade, ms: porId.get(atividade.id) }))
    .sort((x, y) => y.ms - x.ms)
}

// Atividades concluídas dentro do intervalo, pela ordem de conclusão.
export function concluidasNoIntervalo(atividades, intervalo) {
  return atividades
    .filter((a) => {
      if (a.status !== 'concluida' || !a.concluidoEm) return false
      const ms = paraMs(a.concluidoEm)
      return ms >= intervalo.inicio && ms < intervalo.fim
    })
    .sort((a, b) => paraMs(a.concluidoEm) - paraMs(b.concluidoEm))
}

// "24h 40min", "2h", "45min", "0min".
export function formatarDuracao(ms) {
  const totalMin = Math.floor(Math.max(0, ms) / 60000)
  const horas = Math.floor(totalMin / 60)
  const minutos = totalMin % 60
  if (horas === 0) return `${minutos}min`
  if (minutos === 0) return `${horas}h`
  return `${horas}h ${minutos}min`
}

// "01:02:05"; as horas podem passar de 99.
export function formatarCronometro(ms) {
  const totalSeg = Math.floor(Math.max(0, ms) / 1000)
  const horas = Math.floor(totalSeg / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60
  return [horas, minutos, segundos].map((n) => String(n).padStart(2, '0')).join(':')
}

// Núcleo dos ajustes de tempo: muda as sessões selecionadas para que somem novoMs,
// sem sobrepor outras sessões e sem sair de [inicioMinimo, fimMaximo].
// Reduzir: tira dos registros mais recentes (encurta o fim; apaga o que zerar).
// Aumentar: em cada sessão, da mais recente para a mais antiga, antecipa o início até o
// registro anterior e depois estende o fim até o próximo registro ou até fimMaximo.
// Sem sessões selecionadas, cria uma terminando agora (ou no início da sessão aberta de outra).
// Devolve { ok: true, sessoes } com a lista completa nova ou { ok: false, erro }.
function ajustarSessoes(sessoes, selecionar, atividadeId, novoMs, agora, criarId, limites) {
  const { inicioMinimo = -Infinity, fimMaximo = agora, ondeFalta = '' } = limites
  if (!Number.isFinite(novoMs) || novoMs < 0) {
    return { ok: false, erro: 'Informe um tempo válido.' }
  }
  const minhas = sessoes.filter(selecionar)
  if (minhas.some((s) => s.fim === null)) {
    return { ok: false, erro: 'Pause a atividade antes de ajustar o tempo.' }
  }
  const atual = minhas.reduce((total, s) => total + duracaoMs(s, agora), 0)
  const diferenca = novoMs - atual
  if (diferenca === 0) return { ok: true, sessoes }

  // Estado de trabalho em ms: id -> { inicio, fim }.
  const faixas = new Map(
    sessoes.map((s) => [s.id, { inicio: paraMs(s.inicio), fim: fimEfetivo(s, agora) }])
  )
  const alteradas = new Set(minhas.map((s) => s.id))
  const removidas = new Set()
  let nova = null

  if (diferenca < 0) {
    let reduzir = -diferenca
    const maisRecentes = [...minhas].sort((a, b) => faixas.get(b.id).fim - faixas.get(a.id).fim)
    for (const s of maisRecentes) {
      if (reduzir <= 0) break
      const faixa = faixas.get(s.id)
      const duracao = faixa.fim - faixa.inicio
      if (duracao <= reduzir) {
        removidas.add(s.id)
        reduzir -= duracao
      } else {
        faixa.fim -= reduzir
        reduzir = 0
      }
    }
  } else {
    let somar = diferenca
    const candidatas = [...minhas]
    if (!candidatas.length) {
      const aberta = sessaoAberta(sessoes)
      const ancora = Math.min(aberta ? paraMs(aberta.inicio) : agora, fimMaximo)
      nova = { id: criarId(), atividadeId, inicio: '', fim: '', nota: '' }
      faixas.set(nova.id, { inicio: ancora, fim: ancora })
      candidatas.push(nova)
    }
    candidatas.sort((a, b) => faixas.get(b.id).fim - faixas.get(a.id).fim)

    for (const s of candidatas) {
      if (somar <= 0) break
      const faixa = faixas.get(s.id)
      let anterior = inicioMinimo
      let proximo = fimMaximo
      for (const [id, outra] of faixas) {
        if (id === s.id) continue
        if (outra.fim <= faixa.inicio) anterior = Math.max(anterior, outra.fim)
        if (outra.inicio >= faixa.fim) proximo = Math.min(proximo, outra.inicio)
      }
      const antes = Math.max(0, Math.min(somar, faixa.inicio - anterior))
      faixa.inicio -= antes
      somar -= antes
      const depois = Math.max(0, Math.min(somar, proximo - faixa.fim))
      faixa.fim += depois
      somar -= depois
    }
    if (somar > 0) {
      return {
        ok: false,
        erro: `Não há horário livre${ondeFalta} para somar mais ${formatarDuracao(somar)} sem sobrepor outros registros.`
      }
    }
  }

  const paraIso = (ms) => new Date(ms).toISOString()
  const resultado = sessoes
    .filter((s) => !removidas.has(s.id))
    .map((s) => {
      if (!alteradas.has(s.id)) return s
      const faixa = faixas.get(s.id)
      return { ...s, inicio: paraIso(faixa.inicio), fim: paraIso(faixa.fim) }
    })
  if (nova) {
    const faixa = faixas.get(nova.id)
    resultado.push({ ...nova, inicio: paraIso(faixa.inicio), fim: paraIso(faixa.fim) })
  }
  return { ok: true, sessoes: resultado }
}

// Define o tempo total de uma atividade. inicioMinimo (ms) impede que o acréscimo comece antes
// disso (ex.: a criação da atividade).
export function ajustarTempoTotal(
  atividadeId,
  sessoes,
  novoTotalMs,
  agora,
  criarId,
  inicioMinimo = -Infinity
) {
  const ondeFalta = Number.isFinite(inicioMinimo)
    ? ` entre a criação da atividade (${formatarDataHora(inicioMinimo)}) e agora`
    : ''
  return ajustarSessoes(
    sessoes,
    (s) => s.atividadeId === atividadeId,
    atividadeId,
    novoTotalMs,
    agora,
    criarId,
    { inicioMinimo, fimMaximo: agora, ondeFalta }
  )
}

// Define o tempo de uma atividade num dia (sessões que começam nesse dia), sem sair do dia,
// sem passar de agora e sem começar antes de inicioMinimo.
export function ajustarTempoDoDia(
  atividadeId,
  dia,
  sessoes,
  novoMs,
  agora,
  criarId,
  inicioMinimo = -Infinity
) {
  const doDia = intervaloDoDia(dia)
  return ajustarSessoes(
    sessoes,
    (s) => s.atividadeId === atividadeId && chaveDia(s.inicio) === dia,
    atividadeId,
    novoMs,
    agora,
    criarId,
    {
      inicioMinimo: Math.max(doDia.inicio, inicioMinimo),
      fimMaximo: Math.min(doDia.fim, agora),
      ondeFalta: ' neste dia'
    }
  )
}
