import { describe, expect, it } from 'vitest'
import {
  ajustarTempoDoDia,
  ajustarTempoTotal,
  atividadeDaUltimaSessao,
  concluidasNoIntervalo,
  duracaoMs,
  formatarCronometro,
  formatarDuracao,
  horasPorAtividade,
  registrosDoIntervalo,
  somaPorDia,
  totaisPorAtividade,
  totalAtividade
} from '../src/utils/calculos.js'
import { intervaloDaSemana, semanaDe } from '../src/utils/datas.js'

const HORA = 3600000
const MIN = 60000
const ms = (texto) => Date.parse(texto)
const sessao = (id, atividadeId, inicio, fim) => ({ id, atividadeId, inicio, fim, nota: '' })
const atividade = (id, extra = {}) => ({
  id,
  titulo: id.toUpperCase(),
  descricao: '',
  status: 'pendente',
  criadoEm: '2026-10-01T12:00:00Z',
  concluidoEm: null,
  ...extra
})

const semana = semanaDe('2026-10-22T15:00:00Z') // 19/10 a 23/10/2026
const intervaloSemana = intervaloDaSemana(semana)

describe('duracaoMs', () => {
  it('calcula sessão fechada', () => {
    const s = sessao('s1', 'a1', '2026-10-19T12:00:00Z', '2026-10-19T13:30:00Z')
    expect(duracaoMs(s, 0)).toBe(90 * MIN)
  })

  it('sessão aberta vai até agora', () => {
    const s = sessao('s1', 'a1', '2026-10-19T12:00:00Z', null)
    expect(duracaoMs(s, ms('2026-10-19T12:10:00Z'))).toBe(10 * MIN)
  })

  it('nunca é negativa', () => {
    const s = sessao('s1', 'a1', '2026-10-19T12:00:00Z', null)
    expect(duracaoMs(s, ms('2026-10-19T11:00:00Z'))).toBe(0)
  })
})

describe('totalAtividade', () => {
  it('soma só as sessões da atividade', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-19T12:00:00Z', '2026-10-19T13:00:00Z'),
      sessao('s2', 'a2', '2026-10-19T13:00:00Z', '2026-10-19T14:00:00Z'),
      sessao('s3', 'a1', '2026-10-19T14:00:00Z', null)
    ]
    expect(totalAtividade('a1', sessoes, ms('2026-10-19T14:30:00Z'))).toBe(HORA + 30 * MIN)
  })
})

describe('totaisPorAtividade', () => {
  it('soma todas as atividades de uma vez, contando a aberta até agora', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-19T12:00:00Z', '2026-10-19T13:00:00Z'),
      sessao('s2', 'a2', '2026-10-19T13:00:00Z', '2026-10-19T14:00:00Z'),
      sessao('s3', 'a1', '2026-10-19T14:00:00Z', null)
    ]
    const totais = totaisPorAtividade(sessoes, ms('2026-10-19T14:30:00Z'))
    expect(totais.get('a1')).toBe(HORA + 30 * MIN)
    expect(totais.get('a2')).toBe(HORA)
    expect(totais.has('a3')).toBe(false)
  })
})

describe('somaPorDia', () => {
  it('divide a sessão que passa da meia-noite de São Paulo', () => {
    // 19/10 22:00 até 20/10 01:30 em SP
    const sessoes = [sessao('s1', 'a1', '2026-10-20T01:00:00Z', '2026-10-20T04:30:00Z')]
    expect(somaPorDia(sessoes, ['2026-10-19', '2026-10-20', '2026-10-21'], 0)).toEqual({
      '2026-10-19': 2 * HORA,
      '2026-10-20': 90 * MIN,
      '2026-10-21': 0
    })
  })
})

describe('registrosDoIntervalo', () => {
  it('junta as sessões da mesma atividade no mesmo dia, do dia mais recente para o mais antigo', () => {
    // 20/10 em SP: a1 09:00–10:00, a2 10:00–11:00, a1 11:00–11:30; 21/10: a1 09:00–agora
    const sessoes = [
      sessao('s3', 'a1', '2026-10-20T14:00:00Z', '2026-10-20T14:30:00Z'),
      sessao('s1', 'a1', '2026-10-20T12:00:00Z', '2026-10-20T13:00:00Z'),
      sessao('s2', 'a2', '2026-10-20T13:00:00Z', '2026-10-20T14:00:00Z'),
      sessao('s4', 'a1', '2026-10-21T12:00:00Z', null),
      sessao('s5', 'a1', '2026-10-24T12:00:00Z', '2026-10-24T13:00:00Z') // sábado: fora da semana
    ]
    expect(registrosDoIntervalo(sessoes, intervaloSemana, ms('2026-10-21T12:30:00Z'))).toEqual([
      {
        chave: '2026-10-21|a1',
        dia: '2026-10-21',
        atividadeId: 'a1',
        inicio: '2026-10-21T12:00:00Z',
        fim: null,
        ms: 30 * MIN
      },
      {
        chave: '2026-10-20|a1',
        dia: '2026-10-20',
        atividadeId: 'a1',
        inicio: '2026-10-20T12:00:00Z',
        fim: '2026-10-20T14:30:00Z',
        ms: 90 * MIN
      },
      {
        chave: '2026-10-20|a2',
        dia: '2026-10-20',
        atividadeId: 'a2',
        inicio: '2026-10-20T13:00:00Z',
        fim: '2026-10-20T14:00:00Z',
        ms: HORA
      }
    ])
  })
})

describe('atividadeDaUltimaSessao', () => {
  it('devolve a atividade da sessão encerrada por último, ignorando a aberta', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-20T12:00:00Z', '2026-10-20T14:00:00Z'),
      sessao('s2', 'a2', '2026-10-20T10:00:00Z', '2026-10-20T11:00:00Z'),
      sessao('s3', 'a3', '2026-10-20T15:00:00Z', null)
    ]
    expect(atividadeDaUltimaSessao(sessoes)).toBe('a1')
  })

  it('compara pelo instante, mesmo com fusos diferentes no texto', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-20T12:00:00Z', '2026-10-20T14:00:00Z'),
      sessao('s2', 'a2', '2026-10-20T12:00:00-03:00', '2026-10-20T12:30:00-03:00') // 15:30 UTC
    ]
    expect(atividadeDaUltimaSessao(sessoes)).toBe('a2')
  })

  it('devolve null sem sessões encerradas', () => {
    expect(atividadeDaUltimaSessao([])).toBeNull()
    expect(atividadeDaUltimaSessao([sessao('s1', 'a1', '2026-10-20T12:00:00Z', null)])).toBeNull()
  })
})

describe('horasPorAtividade', () => {
  it('ordena do maior para o menor e ignora tempo fora do intervalo', () => {
    const atividades = [atividade('a1'), atividade('a2'), atividade('a3')]
    const sessoes = [
      sessao('s1', 'a1', '2026-10-20T12:00:00Z', '2026-10-20T13:00:00Z'),
      sessao('s2', 'a2', '2026-10-21T12:00:00Z', '2026-10-21T15:00:00Z'),
      sessao('s3', 'a3', '2026-10-12T12:00:00Z', '2026-10-12T15:00:00Z') // semana anterior
    ]
    const resultado = horasPorAtividade(atividades, sessoes, intervaloSemana, 0)
    expect(resultado.map((r) => [r.atividade.id, r.ms])).toEqual([
      ['a2', 3 * HORA],
      ['a1', HORA]
    ])
  })
})

describe('concluidasNoIntervalo', () => {
  it('respeita a sexta 23:59 de São Paulo como limite da semana útil', () => {
    const atividades = [
      atividade('a1', { status: 'concluida', concluidoEm: '2026-10-24T02:59:00Z' }),
      atividade('a2', { status: 'concluida', concluidoEm: '2026-10-24T03:00:00Z' }), // sábado
      atividade('a3')
    ]
    expect(concluidasNoIntervalo(atividades, intervaloSemana).map((a) => a.id)).toEqual(['a1'])
  })
})

describe('formatarDuracao', () => {
  it('usa horas e minutos', () => {
    expect(formatarDuracao(24 * HORA + 40 * MIN)).toBe('24h 40min')
    expect(formatarDuracao(3 * HORA + 5 * MIN)).toBe('3h 5min')
    expect(formatarDuracao(2 * HORA)).toBe('2h')
    expect(formatarDuracao(45 * MIN)).toBe('45min')
    expect(formatarDuracao(59999)).toBe('0min')
    expect(formatarDuracao(-5)).toBe('0min')
  })
})

describe('formatarCronometro', () => {
  it('mostra hh:mm:ss e passa de 99 horas', () => {
    expect(formatarCronometro(3725000)).toBe('01:02:05')
    expect(formatarCronometro(100 * HORA)).toBe('100:00:00')
  })
})

describe('ajustarTempoTotal', () => {
  const agora = ms('2026-10-20T20:00:00Z')
  const criarId = () => 'nova'
  const faixas = (sessoes, atividadeId) =>
    sessoes.filter((s) => s.atividadeId === atividadeId).map((s) => [s.id, s.inicio, s.fim])

  it('reduz encurtando o registro mais recente', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'),
      sessao('s2', 'a1', '2026-10-20T14:00:00.000Z', '2026-10-20T15:00:00.000Z')
    ]
    const r = ajustarTempoTotal('a1', sessoes, 90 * MIN, agora, criarId)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['s1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'],
      ['s2', '2026-10-20T14:00:00.000Z', '2026-10-20T14:30:00.000Z']
    ])
  })

  it('reduz apagando o registro que zera e encurtando o anterior', () => {
    const sessoes = [
      sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'),
      sessao('s2', 'a1', '2026-10-20T14:00:00.000Z', '2026-10-20T15:00:00.000Z')
    ]
    const r = ajustarTempoTotal('a1', sessoes, 30 * MIN, agora, criarId)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['s1', '2026-10-20T12:00:00.000Z', '2026-10-20T12:30:00.000Z']
    ])
  })

  it('aumenta antecipando o início até o registro anterior e depois estendendo o fim', () => {
    const outra = sessao('o1', 'a2', '2026-10-20T10:00:00.000Z', '2026-10-20T11:00:00.000Z')
    const sessoes = [outra, sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z')]
    const r = ajustarTempoTotal('a1', sessoes, 150 * MIN, agora, criarId)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['s1', '2026-10-20T11:00:00.000Z', '2026-10-20T13:30:00.000Z']
    ])
    expect(r.sessoes[0]).toBe(outra)
  })

  it('recusa aumentar quando não há horário livre', () => {
    const sessoes = [
      sessao('o1', 'a2', '2026-10-20T11:00:00.000Z', '2026-10-20T12:00:00.000Z'),
      sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'),
      sessao('o2', 'a2', '2026-10-20T13:00:00.000Z', '2026-10-20T14:00:00.000Z')
    ]
    const r = ajustarTempoTotal('a1', sessoes, 2 * HORA, ms('2026-10-20T14:00:00Z'), criarId)
    expect(r.ok).toBe(false)
    expect(r.erro).toMatch(/Não há horário livre/)
  })

  it('cria um registro quando a atividade ainda não tem tempo', () => {
    // a2 está rodando desde 18:00 UTC; o novo registro termina nesse início.
    const sessoes = [sessao('o1', 'a2', '2026-10-20T18:00:00.000Z', null)]
    const r = ajustarTempoTotal('a1', sessoes, HORA, agora, criarId)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['nova', '2026-10-20T17:00:00.000Z', '2026-10-20T18:00:00.000Z']
    ])
  })

  it('não mexe em nada quando o tempo não muda', () => {
    const sessoes = [sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z')]
    expect(ajustarTempoTotal('a1', sessoes, HORA, agora, criarId)).toEqual({ ok: true, sessoes })
  })

  it('não deixa o acréscimo começar antes da criação da atividade', () => {
    const criadaEm = ms('2026-10-20T11:30:00Z')
    const sessoes = [sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z')]
    const r = ajustarTempoTotal('a1', sessoes, 2 * HORA, agora, criarId, criadaEm)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['s1', '2026-10-20T11:30:00.000Z', '2026-10-20T13:30:00.000Z']
    ])
  })

  it('recusa valores que não cabem entre a criação e agora', () => {
    const criadaEm = ms('2026-10-20T11:30:00Z')
    const sessoes = [sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z')]
    const r = ajustarTempoTotal('a1', sessoes, 999 * HORA, agora, criarId, criadaEm)
    expect(r.ok).toBe(false)
    expect(r.erro).toMatch(/entre a criação da atividade \(20\/10\/2026 08:30\)/)
  })

  it('não encurta uma sessão que já começava antes do limite', () => {
    // Sessão lançada antes da criação; o acréscimo vai todo para depois dela.
    const criadaEm = ms('2026-10-20T11:30:00Z')
    const sessoes = [sessao('s1', 'a1', '2026-10-20T10:00:00.000Z', '2026-10-20T11:00:00.000Z')]
    const r = ajustarTempoTotal('a1', sessoes, 90 * MIN, agora, criarId, criadaEm)
    expect(faixas(r.sessoes, 'a1')).toEqual([
      ['s1', '2026-10-20T10:00:00.000Z', '2026-10-20T11:30:00.000Z']
    ])
  })

  it('recusa ajustar atividade rodando e tempo inválido', () => {
    const rodando = [sessao('s1', 'a1', '2026-10-20T19:00:00.000Z', null)]
    expect(ajustarTempoTotal('a1', rodando, HORA, agora, criarId).erro).toMatch(/Pause/)
    expect(ajustarTempoTotal('a1', [], -1, agora, criarId).erro).toMatch(/tempo válido/)
  })
})

describe('ajustarTempoDoDia', () => {
  const agora = ms('2026-10-22T20:00:00Z')
  const criarId = () => 'nova'
  const faixas = (sessoes) => sessoes.map((s) => [s.id, s.inicio, s.fim])

  it('mexe só nas sessões da atividade naquele dia', () => {
    const outroDia = sessao('d3', 'a1', '2026-10-21T12:00:00.000Z', '2026-10-21T13:00:00.000Z')
    const sessoes = [
      sessao('d1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'),
      sessao('d2', 'a1', '2026-10-20T14:00:00.000Z', '2026-10-20T15:00:00.000Z'),
      outroDia
    ]
    const r = ajustarTempoDoDia('a1', '2026-10-20', sessoes, 90 * MIN, agora, criarId)
    expect(faixas(r.sessoes)).toEqual([
      ['d1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z'],
      ['d2', '2026-10-20T14:00:00.000Z', '2026-10-20T14:30:00.000Z'],
      ['d3', '2026-10-21T12:00:00.000Z', '2026-10-21T13:00:00.000Z']
    ])
    expect(r.sessoes[2]).toBe(outroDia)
  })

  it('ao aumentar, não antecipa para antes da meia-noite do dia', () => {
    // 20/10 00:30–01:00 em SP; o acréscimo recua só até 00:00 e o resto vai para depois.
    const sessoes = [sessao('s1', 'a1', '2026-10-20T03:30:00.000Z', '2026-10-20T04:00:00.000Z')]
    const r = ajustarTempoDoDia('a1', '2026-10-20', sessoes, 2 * HORA, agora, criarId)
    expect(faixas(r.sessoes)).toEqual([
      ['s1', '2026-10-20T03:00:00.000Z', '2026-10-20T05:00:00.000Z']
    ])
  })

  it('recusa quando não cabe no dia até agora', () => {
    const sessoes = [sessao('s1', 'a1', '2026-10-20T03:30:00.000Z', '2026-10-20T04:00:00.000Z')]
    const r = ajustarTempoDoDia('a1', '2026-10-20', sessoes, 2 * HORA, ms('2026-10-20T04:00:00Z'), criarId)
    expect(r.ok).toBe(false)
    expect(r.erro).toMatch(/neste dia/)
  })

  it('zerar o tempo apaga as sessões do dia', () => {
    const sessoes = [sessao('s1', 'a1', '2026-10-20T12:00:00.000Z', '2026-10-20T13:00:00.000Z')]
    expect(ajustarTempoDoDia('a1', '2026-10-20', sessoes, 0, agora, criarId).sessoes).toEqual([])
  })
})
