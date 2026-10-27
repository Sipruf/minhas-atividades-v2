// Leitura e gravação no localStorage, e sincronização com outras abas abertas.

import { interpretarBackup, montarBackup, VERSAO_BACKUP } from '../utils/backup.js'

export const CHAVE = 'minhas-atividades-v2'
// Prefixo das cópias de dados salvos que estavam inválidos (nunca são apagadas pelo app).
export const PREFIXO_RECUPERACAO = 'minhas-atividades-v2-recuperacao-'

// Os dados vieram do próprio app: sobreposição não impede o carregamento.
const OPCOES_LEITURA = { verificarSobreposicao: false }

let ultimoTextoGravado = null

const vazio = () => ({ versao: VERSAO_BACKUP, atividades: [], sessoes: [] })

// Devolve { dados, aviso }. aviso é um texto para mostrar na tela, ou null.
export function carregar() {
  let texto
  try {
    texto = localStorage.getItem(CHAVE)
  } catch {
    return {
      dados: vazio(),
      aviso: 'Não foi possível acessar o armazenamento do navegador. Os dados não serão salvos.'
    }
  }
  if (texto === null) return { dados: vazio(), aviso: null }

  const resultado = interpretarBackup(texto, OPCOES_LEITURA)
  if (resultado.ok) {
    ultimoTextoGravado = texto
    return { dados: resultado.dados, aviso: null }
  }

  try {
    localStorage.setItem(PREFIXO_RECUPERACAO + new Date().toISOString(), texto)
  } catch {
    return {
      dados: vazio(),
      aviso: 'Os dados salvos estão inválidos e não foi possível guardar uma cópia. Exporte o que precisar antes de continuar.'
    }
  }
  return {
    dados: vazio(),
    aviso: 'Os dados salvos estavam inválidos. Uma cópia foi guardada à parte e o app começou vazio.'
  }
}

// Grava os dados. Devolve um texto de erro, ou null se deu certo.
export function salvar(dados) {
  const texto = JSON.stringify(montarBackup(dados))
  if (texto === ultimoTextoGravado) return null
  try {
    localStorage.setItem(CHAVE, texto)
    ultimoTextoGravado = texto
    return null
  } catch {
    return 'Não foi possível salvar no navegador (armazenamento cheio ou bloqueado). Exporte um backup.'
  }
}

// Cópias guardadas quando os dados salvos estavam inválidos: [{ chave, guardadaEm, texto }],
// da mais recente para a mais antiga.
export function listarRecuperacoes() {
  try {
    const lista = []
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i)
      if (!chave?.startsWith(PREFIXO_RECUPERACAO)) continue
      lista.push({
        chave,
        guardadaEm: chave.slice(PREFIXO_RECUPERACAO.length),
        texto: localStorage.getItem(chave)
      })
    }
    return lista.sort((a, b) => b.chave.localeCompare(a.chave))
  } catch {
    return []
  }
}

// Chama aoMudar(dados) quando outra aba grava dados válidos.
export function observarOutrasAbas(aoMudar) {
  window.addEventListener('storage', (evento) => {
    if (evento.key !== CHAVE || evento.newValue === null) return
    const resultado = interpretarBackup(evento.newValue, OPCOES_LEITURA)
    if (!resultado.ok) return
    ultimoTextoGravado = evento.newValue
    aoMudar(resultado.dados)
  })
}
