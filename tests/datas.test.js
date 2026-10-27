import { describe, expect, it } from 'vitest'
import {
  chaveDia,
  deslocarSemana,
  diaDaSemana,
  formatarDataHora,
  formatarHora,
  inicioDoDia,
  intervaloDaSemana,
  nomeDiaSemana,
  rotuloSemana,
  semanaDe,
  somarDias
} from '../src/utils/datas.js'

const iso = (ms) => new Date(ms).toISOString()

describe('chaveDia', () => {
  it('usa o dia de São Paulo, não o de UTC', () => {
    expect(chaveDia('2026-10-20T02:30:00Z')).toBe('2026-10-19') // 23:30 em SP
    expect(chaveDia('2026-10-20T03:00:00Z')).toBe('2026-10-20') // 00:00 em SP
  })
})

describe('inicioDoDia', () => {
  it('é a meia-noite de São Paulo (03:00 UTC)', () => {
    expect(iso(inicioDoDia('2026-10-19'))).toBe('2026-10-19T03:00:00.000Z')
  })
})

describe('somarDias', () => {
  it('atravessa mês e ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('diaDaSemana e nomeDiaSemana', () => {
  it('segunda é 0 e domingo é 6', () => {
    expect(diaDaSemana('2026-10-19')).toBe(0)
    expect(diaDaSemana('2026-10-25')).toBe(6)
    expect(nomeDiaSemana('2026-10-24')).toBe('sáb')
    expect(nomeDiaSemana('2026-10-21', true)).toBe('quarta-feira')
  })
})

describe('semanaDe', () => {
  it('vai de segunda a sexta', () => {
    const semana = semanaDe('2026-10-22T15:00:00Z')
    expect(semana.inicio).toBe('2026-10-19')
    expect(semana.fim).toBe('2026-10-23')
    expect(semana.dias).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'])
  })

  it('no fim de semana, devolve a semana útil que acabou de terminar', () => {
    expect(semanaDe('2026-10-24T15:00:00Z').inicio).toBe('2026-10-19') // sábado
  })

  it('domingo 23:59 em São Paulo ainda é a mesma semana', () => {
    expect(semanaDe('2026-10-26T02:59:00Z').inicio).toBe('2026-10-19')
    expect(semanaDe('2026-10-26T03:00:00Z').inicio).toBe('2026-10-26')
  })

  it('desloca semanas para trás e para frente', () => {
    const semana = semanaDe('2026-10-22T15:00:00Z')
    expect(deslocarSemana(semana, -1).inicio).toBe('2026-10-12')
    expect(deslocarSemana(semana, 10).inicio).toBe('2026-12-28')
  })
})

describe('intervaloDaSemana', () => {
  it('começa na segunda 00:00 e termina no sábado 00:00 de São Paulo', () => {
    const intervalo = intervaloDaSemana(semanaDe('2026-10-22T15:00:00Z'))
    expect(iso(intervalo.inicio)).toBe('2026-10-19T03:00:00.000Z')
    expect(iso(intervalo.fim)).toBe('2026-10-24T03:00:00.000Z')
  })
})

describe('rotuloSemana', () => {
  it('mostra o ano uma vez quando a semana é do mesmo ano', () => {
    expect(rotuloSemana(semanaDe('2026-10-22T15:00:00Z'))).toBe('19/10 a 23/10/2026')
  })

  it('mostra os dois anos na virada', () => {
    expect(rotuloSemana(semanaDe('2026-12-30T15:00:00Z'))).toBe('28/12/2026 a 01/01/2027')
  })
})

describe('formatação de hora', () => {
  it('formata no horário de São Paulo', () => {
    expect(formatarHora('2026-10-19T12:05:00Z')).toBe('09:05')
    expect(formatarHora('2026-10-20T03:00:00Z')).toBe('00:00')
    expect(formatarDataHora('2026-10-19T12:05:00Z')).toBe('19/10/2026 09:05')
  })
})
