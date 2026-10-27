<script setup>
import { computed, ref, useId, watch } from 'vue'
import ConfirmarDialog from '../components/ConfirmarDialog.vue'
import ListaSessoes from '../components/ListaSessoes.vue'
import Semana from './Semana.vue'
import { dadosParaBackup, estado, mostrarAviso, substituirDados } from '../store/estado.js'
import { listarRecuperacoes } from '../store/persistencia.js'
import { interpretarBackup } from '../utils/backup.js'
import { formatarDuracao, registrosDoIntervalo } from '../utils/calculos.js'
import { gerarRelatorio } from '../utils/relatorio.js'
import {
  chaveDia,
  deslocarSemana,
  formatarDataHora,
  formatarDiaMes,
  intervaloDaSemana,
  nomeDiaSemana,
  rotuloSemana,
  semanaDe
} from '../utils/datas.js'

const TAMANHO_MAXIMO = 5 * 1024 * 1024

const id = useId()

// ---- Semana escolhida (vale para o resumo e para os registros) ----

// 0 = semana atual, -1 = anterior, e assim por diante. Não há semanas futuras.
const deslocamento = ref(0)
const semana = computed(() => deslocarSemana(semanaDe(estado.agora), deslocamento.value))
const ehSemanaAtual = computed(() => deslocamento.value === 0)

function mudarSemana(passo) {
  deslocamento.value = Math.min(0, deslocamento.value + passo)
}

// ---- Registros da semana: guardados em cada dia (seg a sex), um por atividade ----

const hoje = computed(() => chaveDia(estado.agora))

const diasComRegistros = computed(() => {
  const registros = registrosDoIntervalo(
    estado.sessoes,
    intervaloDaSemana(semana.value),
    estado.agora
  )
  return semana.value.dias.map((dia) => {
    const doDia = registros.filter((r) => r.dia === dia)
    return { dia, registros: doDia, ms: doDia.reduce((total, r) => total + r.ms, 0) }
  })
})

// Dias abertos no acordeão; ao trocar de semana, tudo volta fechado e o texto manual some.
const diasAbertos = ref(new Set())
watch(
  () => semana.value.inicio,
  () => {
    diasAbertos.value = new Set()
    textoManual.value = ''
  }
)

function alternarDia(dia) {
  const novos = new Set(diasAbertos.value)
  if (novos.has(dia)) novos.delete(dia)
  else novos.add(dia)
  diasAbertos.value = novos
}

// ---- Backup ----

function baixarArquivo(nome, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const quantidades = (dados) => {
  const atividades = dados.atividades.length === 1 ? '1 atividade' : `${dados.atividades.length} atividades`
  const registros = dados.sessoes.length === 1 ? '1 registro' : `${dados.sessoes.length} registros`
  return `${atividades} e ${registros}`
}

function exportar() {
  const dados = dadosParaBackup()
  baixarArquivo(
    `minhas-atividades-v2-backup-${chaveDia(Date.now())}.json`,
    JSON.stringify(dados, null, 2)
  )
  mostrarAviso(`Backup exportado: ${quantidades(dados)}.`, 'sucesso')
}

const campoArquivo = ref(null)
const errosImportacao = ref([])
const importacaoPendente = ref(null)
const confirmacaoAberta = ref(false)

const mensagemImportacao = computed(() => {
  if (!importacaoPendente.value) return ''
  return [
    `O backup tem ${quantidades(importacaoPendente.value)}.`,
    `Os dados atuais (${quantidades(estado)}) serão substituídos.`,
    'Se ainda não exportou, cancele e exporte um backup antes.',
    'Esta ação não pode ser desfeita.'
  ].join('\n')
})

async function aoEscolherArquivo(evento) {
  const arquivo = evento.target.files?.[0]
  // Limpa o campo para permitir escolher o mesmo arquivo de novo.
  evento.target.value = ''
  errosImportacao.value = []
  if (!arquivo) return
  if (arquivo.size > TAMANHO_MAXIMO) {
    errosImportacao.value = ['O arquivo passa de 5 MB e não parece um backup deste app.']
    return
  }
  let texto
  try {
    texto = await arquivo.text()
  } catch {
    errosImportacao.value = ['Não foi possível ler o arquivo.']
    return
  }
  const resultado = interpretarBackup(texto)
  if (!resultado.ok) {
    errosImportacao.value = resultado.erros
    return
  }
  importacaoPendente.value = resultado.dados
  confirmacaoAberta.value = true
}

function confirmarImportacao() {
  const dados = importacaoPendente.value
  substituirDados(dados)
  confirmacaoAberta.value = false
  importacaoPendente.value = null
  mostrarAviso(`Backup importado: ${quantidades(dados)}.`, 'sucesso')
}

function cancelarImportacao() {
  confirmacaoAberta.value = false
  importacaoPendente.value = null
}

// ---- Relatório da semana selecionada ----

// Preenchido só quando a cópia automática falha, para copiar à mão.
const textoManual = ref('')

async function copiarRelatorio() {
  const texto = gerarRelatorio(estado, semana.value, estado.agora)
  textoManual.value = ''
  try {
    await navigator.clipboard.writeText(texto)
    mostrarAviso('Relatório copiado. É só colar.', 'sucesso')
  } catch {
    textoManual.value = texto
    mostrarAviso('Não foi possível copiar automaticamente. Copie o texto abaixo.', 'erro')
  }
}

// ---- Cópias de recuperação (dados salvos que estavam inválidos) ----

const recuperacoes = ref(listarRecuperacoes())

function baixarRecuperacao(copia) {
  const data = chaveDia(copia.guardadaEm)
  baixarArquivo(`minhas-atividades-v2-recuperacao-${data}.json`, copia.texto)
}
</script>

<template>
  <div class="dados">
    <!-- Seletor de semana -->
    <div class="seletor" role="group" aria-label="Escolher semana">
      <button
        type="button"
        class="botao botao-icone"
        aria-label="Semana anterior"
        @click="mudarSemana(-1)"
      >
        ‹
      </button>
      <p class="rotulo-semana" aria-live="polite">{{ rotuloSemana(semana) }}</p>
      <button
        type="button"
        class="botao botao-icone"
        aria-label="Próxima semana"
        :disabled="ehSemanaAtual"
        @click="mudarSemana(1)"
      >
        ›
      </button>
      <button
        v-if="!ehSemanaAtual"
        type="button"
        class="botao botao-contorno"
        @click="deslocamento = 0"
      >
        Esta semana
      </button>
    </div>

    <div class="colunas">
      <div class="coluna">
        <Semana :semana="semana" />
      </div>

      <div class="coluna">
        <!-- Registros -->
        <section :aria-labelledby="`${id}-registros`">
          <h2 :id="`${id}-registros`" class="titulo-secao">Registros da semana</h2>
          <p class="secundario descricao-registros">
            Ajuste ou apague o tempo de uma atividade num dia.
          </p>
          <ul class="lista-limpa lista-dias">
            <li
              v-for="item in diasComRegistros"
              :key="item.dia"
              class="acordeao"
              :class="{ hoje: item.dia === hoje }"
            >
              <button
                type="button"
                class="acordeao-cabecalho"
                :aria-expanded="diasAbertos.has(item.dia) ? 'true' : 'false'"
                :aria-controls="diasAbertos.has(item.dia) ? `${id}-registros-${item.dia}` : undefined"
                @click="alternarDia(item.dia)"
              >
                <span class="acordeao-seta" aria-hidden="true">▸</span>
                <span class="rotulo-dia">
                  {{ nomeDiaSemana(item.dia) }}
                  <span class="secundario">{{ formatarDiaMes(item.dia) }}</span>
                </span>
                <span class="valor" :class="{ zero: !item.ms }">{{ formatarDuracao(item.ms) }}</span>
              </button>
              <div
                v-if="diasAbertos.has(item.dia)"
                :id="`${id}-registros-${item.dia}`"
                class="acordeao-conteudo"
              >
                <ListaSessoes
                  :registros="item.registros"
                  :mostrar-dia="false"
                  vazio="Nenhum registro neste dia."
                />
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Backup e Relatório: centralizado, sempre no fim da página -->
    <section class="cartao backup" :aria-labelledby="`${id}-backup`">
      <h2 :id="`${id}-backup`" class="titulo-secao">Backup e Relatório</h2>
      <p class="secundario">
        Os dados ficam só neste navegador: exporte um backup de vez em quando.
        O relatório copiado é o da semana selecionada ({{ rotuloSemana(semana) }}).
      </p>
      <div class="acoes-backup">
        <button type="button" class="botao botao-primario" @click="exportar">
          Exportar backup
        </button>
        <button type="button" class="botao botao-contorno" @click="campoArquivo.click()">
          Importar backup
        </button>
        <button type="button" class="botao botao-contorno" @click="copiarRelatorio">
          Copiar relatório
        </button>
        <input
          ref="campoArquivo"
          type="file"
          accept=".json,application/json"
          class="visualmente-oculto"
          tabindex="-1"
          aria-hidden="true"
          @change="aoEscolherArquivo"
        />
      </div>

      <div v-if="errosImportacao.length" class="erros" role="alert">
        <p class="erro-campo">O arquivo não foi importado:</p>
        <ul>
          <li v-for="(erroItem, i) in errosImportacao" :key="i">{{ erroItem }}</li>
        </ul>
      </div>

      <div v-if="textoManual" class="campo relatorio-manual">
        <label :for="`${id}-relatorio`">Relatório (selecione e copie)</label>
        <textarea
          :id="`${id}-relatorio`"
          :value="textoManual"
          readonly
          rows="8"
          @focus="$event.target.select()"
        />
      </div>

      <template v-if="recuperacoes.length">
        <h3 class="subtitulo">Cópias de recuperação</h3>
        <p class="secundario">
          Dados salvos que estavam inválidos e foram guardados à parte. Baixe para não perdê-los.
        </p>
        <ul class="lista-limpa lista-recuperacoes">
          <li v-for="copia in recuperacoes" :key="copia.chave">
            <span>{{ formatarDataHora(copia.guardadaEm) }}</span>
            <button type="button" class="botao botao-contorno" @click="baixarRecuperacao(copia)">
              Baixar
            </button>
          </li>
        </ul>
      </template>
    </section>

    <ConfirmarDialog
      :aberto="confirmacaoAberta"
      titulo="Substituir os dados atuais?"
      :mensagem="mensagemImportacao"
      texto-confirmar="Substituir"
      perigo
      @confirmar="confirmarImportacao"
      @cancelar="cancelarImportacao"
    />
  </div>
</template>

<style scoped>
.dados {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dados p {
  margin: 0;
}

.seletor {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--raio);
  background: var(--superficie);
}

.rotulo-semana {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.colunas {
  display: grid;
  gap: 24px;
}

@media (min-width: 900px) {
  .colunas {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.coluna {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.titulo-secao {
  margin: 0 0 4px;
  font-size: 1.125rem;
}

.subtitulo {
  margin: 16px 0 8px;
  font-size: 1rem;
}

/* Caixa centralizada, depois das colunas (no celular, fica no fim da tela). */
.backup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.acoes-backup {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

/* Erros e texto do relatório ficam alinhados à esquerda para ler e selecionar melhor. */
.erros,
.relatorio-manual {
  text-align: left;
}

.erros ul {
  margin: 4px 0 0;
  padding-left: 20px;
  color: var(--perigo-texto);
  font-size: 0.9375rem;
}

.dados .descricao-registros {
  margin-bottom: 12px;
}

/* Dia e registros usam as mesmas colunas: seta | título | tempo | ações (✎ 🗑).
   Assim os títulos ficam sob o nome do dia e os tempos sob o total do dia. */
.lista-dias {
  --colunas-registro: 1rem minmax(0, 1fr) auto calc(var(--toque) * 2 + 4px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lista-dias .acordeao-cabecalho {
  display: grid;
  grid-template-columns: var(--colunas-registro);
}

.hoje .rotulo-dia {
  color: var(--laranja);
  font-weight: 700;
}

.valor {
  justify-self: end;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.valor.zero {
  font-weight: 400;
  color: var(--texto-secundario);
}

.lista-dias .acordeao-conteudo {
  padding: 0 0 4px;
}

.acordeao-conteudo :deep(.lista-registros) {
  gap: 0;
}

.acordeao-conteudo :deep(.item-registro) {
  grid-template-columns: var(--colunas-registro);
  padding: 6px 12px;
  border-top: 1px solid var(--superficie-alta);
  border-radius: 0;
  background: transparent;
}

.acordeao-conteudo :deep(.item-registro > .info) {
  grid-column: 2;
}

.acordeao-conteudo :deep(.item-registro .duracao) {
  justify-self: end;
}

/* Texto de dia vazio alinhado com os títulos. */
.acordeao-conteudo :deep(p.secundario) {
  margin: 0;
  padding: 8px 12px 8px calc(1rem + 24px);
  border-top: 1px solid var(--superficie-alta);
}

.lista-recuperacoes li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}
</style>
