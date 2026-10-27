import { describe, expect, it } from 'vitest'
import { interpretarBackup, montarBackup, validarBackup } from '../src/utils/backup.js'

const agora = Date.parse('2026-10-26T12:00:00Z')

const base = () => ({
  versao: 1,
  atividades: [
    {
      id: 'a1',
      titulo: 'APP-101',
      descricao: 'Ajuste',
      status: 'pendente',
      criadoEm: '2026-10-19T12:00:00.000Z',
      concluidoEm: null
    }
  ],
  sessoes: [
    {
      id: 's1',
      atividadeId: 'a1',
      inicio: '2026-10-19T12:00:00.000Z',
      fim: '2026-10-19T13:00:00.000Z',
      nota: ''
    }
  ]
})

const validar = (dados, opcoes = {}) => validarBackup(dados, { agora, ...opcoes })
const primeiroErro = (dados, opcoes) => validar(dados, opcoes).erros?.[0]

describe('validarBackup', () => {
  it('aceita um backup válido sem alterar os dados', () => {
    expect(validar(base())).toEqual({ ok: true, dados: base() })
  })

  it('aceita o que o próprio app exporta', () => {
    expect(validar(montarBackup(base())).ok).toBe(true)
  })

  it('completa campos opcionais ausentes', () => {
    const dados = base()
    delete dados.atividades[0].descricao
    delete dados.sessoes[0].nota
    const resultado = validar(dados)
    expect(resultado.ok).toBe(true)
    expect(resultado.dados.atividades[0].descricao).toBe('')
    expect(resultado.dados.sessoes[0].nota).toBe('')
  })

  it('ignora campos desconhecidos, como a antiga "tela"', () => {
    const dados = base()
    dados.atividades[0].tela = 'Login'
    const resultado = validar(dados)
    expect(resultado.ok).toBe(true)
    expect(resultado.dados.atividades[0]).not.toHaveProperty('tela')
  })

  it('recusa o que não é objeto', () => {
    expect(primeiroErro([])).toMatch(/não contém um backup/)
    expect(primeiroErro(null)).toMatch(/não contém um backup/)
  })

  it('recusa versão ausente ou mais nova', () => {
    expect(primeiroErro({ ...base(), versao: undefined })).toMatch(/Versão do backup/)
    expect(primeiroErro({ ...base(), versao: 2 })).toMatch(/mais nova/)
  })

  it('recusa listas ausentes', () => {
    expect(primeiroErro({ versao: 1, sessoes: [] })).toMatch(/atividades/)
  })

  it('recusa sessão de atividade inexistente', () => {
    const dados = base()
    dados.sessoes[0].atividadeId = 'x'
    expect(primeiroErro(dados)).toMatch(/atividade inexistente/)
  })

  it('recusa fim igual ou anterior ao início', () => {
    const dados = base()
    dados.sessoes[0].fim = dados.sessoes[0].inicio
    expect(primeiroErro(dados)).toMatch(/fim é anterior ou igual/)
  })

  it('recusa data sem fuso horário', () => {
    const dados = base()
    dados.sessoes[0].inicio = '2026-10-19T12:00:00'
    expect(primeiroErro(dados)).toMatch(/início inválido/)
  })

  it('recusa id repetido', () => {
    const dados = base()
    dados.atividades.push({ ...dados.atividades[0] })
    expect(primeiroErro(dados)).toMatch(/id repetido/)
  })

  it('recusa status inválido e concluída sem data', () => {
    const dados = base()
    dados.atividades[0].status = 'concluida'
    expect(primeiroErro(dados)).toMatch(/concluída sem data/)
    dados.atividades[0].status = 'feito'
    expect(primeiroErro(dados)).toMatch(/status inválido/)
  })

  it('recusa mais de uma sessão em andamento', () => {
    const dados = base()
    dados.sessoes[0].fim = null
    dados.sessoes.push({ ...dados.sessoes[0], id: 's2', inicio: '2026-10-25T12:00:00.000Z' })
    const erros = validar(dados, { verificarSobreposicao: false }).erros
    expect(erros).toContain('Há 2 sessões em andamento; só pode haver uma.')
  })

  it('recusa sessão em andamento em atividade concluída', () => {
    const dados = base()
    dados.atividades[0].status = 'concluida'
    dados.atividades[0].concluidoEm = '2026-10-20T12:00:00.000Z'
    dados.sessoes[0].fim = null
    expect(primeiroErro(dados)).toMatch(/em andamento em atividade concluída/)
  })

  it('recusa sobreposição, a não ser que a verificação esteja desligada', () => {
    const dados = base()
    dados.sessoes.push({
      ...dados.sessoes[0],
      id: 's2',
      inicio: '2026-10-19T12:30:00.000Z',
      fim: '2026-10-19T14:00:00.000Z'
    })
    expect(primeiroErro(dados)).toMatch(/sobrepostos/)
    expect(validar(dados, { verificarSobreposicao: false }).ok).toBe(true)
  })

  it('limita a lista de erros', () => {
    const dados = { versao: 1, atividades: Array.from({ length: 15 }, () => ({})), sessoes: [] }
    const erros = validar(dados).erros
    expect(erros).toHaveLength(11)
    expect(erros[10]).toMatch(/e mais/)
  })
})

describe('interpretarBackup', () => {
  it('recusa texto que não é JSON', () => {
    expect(interpretarBackup('{oops', { agora })).toEqual({
      ok: false,
      erros: ['O arquivo não é um JSON válido.']
    })
  })

  it('lê um JSON válido', () => {
    expect(interpretarBackup(JSON.stringify(base()), { agora }).ok).toBe(true)
  })
})
