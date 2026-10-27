import { describe, expect, it } from 'vitest'
import { gerarRelatorio } from '../src/utils/relatorio.js'
import { deslocarSemana, semanaDe } from '../src/utils/datas.js'

const semana = semanaDe('2026-10-22T15:00:00Z') // 19/10 a 23/10/2026
const agora = Date.parse('2026-10-26T12:00:00Z')

const atividade = (id, titulo, status = 'pendente', concluidoEm = null) => ({
  id,
  titulo,
  descricao: '',
  status,
  criadoEm: '2026-10-01T12:00:00Z',
  concluidoEm
})
const sessao = (id, atividadeId, inicio, fim) => ({ id, atividadeId, inicio, fim, nota: '' })

const dados = {
  atividades: [
    atividade('a1', 'APP-101', 'concluida', '2026-10-21T18:00:00Z'),
    atividade('a2', 'APP-102', 'concluida', '2026-10-23T18:00:00Z'),
    atividade('a3', 'APP-103'),
    atividade('a4', 'APP-104'), // só tem tempo na semana anterior
    atividade('a5', 'APP-105', 'concluida', '2026-10-10T15:00:00Z')
  ],
  sessoes: [
    sessao('s1', 'a1', '2026-10-20T12:00:00Z', '2026-10-20T16:00:00Z'), // 4h
    sessao('s2', 'a2', '2026-10-22T12:00:00Z', '2026-10-22T13:30:00Z'), // 1h30
    sessao('s3', 'a3', '2026-10-23T12:00:00Z', '2026-10-23T14:30:00Z'), // 2h30
    sessao('s4', 'a4', '2026-10-12T12:00:00Z', '2026-10-12T13:00:00Z')
  ]
}

describe('gerarRelatorio', () => {
  it('monta o relatório completo da semana útil', () => {
    expect(gerarRelatorio(dados, semana, agora)).toBe(
      [
        'Relatório semanal — 19/10 a 23/10/2026',
        'Horas registradas: 8h',
        'Concluídas na semana: 2',
        '  • APP-101 (4h)',
        '  • APP-102 (1h 30min)',
        'Em andamento ou pendentes: 1'
      ].join('\n')
    )
  })

  it('indica a semana sem registros sem inventar linhas', () => {
    const vazia = deslocarSemana(semana, -3) // 28/09 a 02/10/2026
    expect(gerarRelatorio(dados, vazia, agora)).toBe(
      'Relatório semanal — 28/09 a 02/10/2026\nSem registros nesta semana.'
    )
  })

  it('desconsidera tempo e conclusões do fim de semana', () => {
    const fimDeSemana = {
      atividades: [atividade('a7', 'APP-107', 'concluida', '2026-10-24T18:00:00Z')], // sábado
      sessoes: [sessao('s1', 'a7', '2026-10-24T12:00:00Z', '2026-10-24T14:00:00Z')]
    }
    expect(gerarRelatorio(fimDeSemana, semana, agora)).toBe(
      'Relatório semanal — 19/10 a 23/10/2026\nSem registros nesta semana.'
    )
  })

  it('omite horas do item concluído sem tempo na semana', () => {
    const so = {
      atividades: [atividade('a6', 'APP-106', 'concluida', '2026-10-20T15:00:00Z')],
      sessoes: []
    }
    expect(gerarRelatorio(so, semana, agora)).toBe(
      ['Relatório semanal — 19/10 a 23/10/2026', 'Concluídas na semana: 1', '  • APP-106'].join('\n')
    )
  })

  it('conta a sessão em andamento até agora', () => {
    const emAndamento = {
      atividades: [atividade('a3', 'APP-103')],
      sessoes: [sessao('s1', 'a3', '2026-10-23T20:00:00Z', null)] // sexta 17:00 em SP
    }
    const sexta19h = Date.parse('2026-10-23T22:00:00Z')
    expect(gerarRelatorio(emAndamento, semana, sexta19h)).toBe(
      [
        'Relatório semanal — 19/10 a 23/10/2026',
        'Horas registradas: 2h',
        'Em andamento ou pendentes: 1'
      ].join('\n')
    )
  })
})
