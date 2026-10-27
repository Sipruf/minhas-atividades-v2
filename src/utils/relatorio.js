// Função pura que monta o texto do relatório semanal. Linhas sem dado são omitidas.

import { intervaloDaSemana, rotuloSemana } from './datas.js'
import {
  concluidasNoIntervalo,
  formatarDuracao,
  horasPorAtividade,
  totalNoIntervalo
} from './calculos.js'

export function gerarRelatorio({ atividades, sessoes }, semana, agora) {
  const intervalo = intervaloDaSemana(semana)
  const horas = new Map(
    horasPorAtividade(atividades, sessoes, intervalo, agora).map((h) => [h.atividade.id, h.ms])
  )
  const total = totalNoIntervalo(sessoes, intervalo, agora)
  const concluidas = concluidasNoIntervalo(atividades, intervalo)
  const idsConcluidas = new Set(concluidas.map((a) => a.id))
  // Não concluídas na semana, mas com tempo registrado nela.
  const abertas = atividades.filter((a) => horas.has(a.id) && !idsConcluidas.has(a.id))

  const linhas = [`Relatório semanal — ${rotuloSemana(semana)}`]

  if (total > 0) linhas.push(`Horas registradas: ${formatarDuracao(total)}`)

  if (concluidas.length) {
    linhas.push(`Concluídas na semana: ${concluidas.length}`)
    for (const atividade of concluidas) {
      let item = `  • ${atividade.titulo}`
      if (horas.has(atividade.id)) item += ` (${formatarDuracao(horas.get(atividade.id))})`
      linhas.push(item)
    }
  }

  if (abertas.length) linhas.push(`Em andamento ou pendentes: ${abertas.length}`)

  if (linhas.length === 1) linhas.push('Sem registros nesta semana.')

  return linhas.join('\n')
}
