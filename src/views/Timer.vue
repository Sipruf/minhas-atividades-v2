<script setup>
import { computed, ref, useId } from 'vue'
import AtividadeCartao from '../components/AtividadeCartao.vue'
import AtividadeDialog from '../components/AtividadeDialog.vue'
import {
  atividadeAtiva,
  concluirAtividade,
  criarAtividade,
  estado,
  iniciarAtividade,
  LIMITES,
  mostrarAviso,
  pausar,
  reabrirAtividade
} from '../store/estado.js'
import {
  atividadeDaUltimaSessao,
  concluidasNoIntervalo,
  formatarCronometro,
  formatarDuracao,
  totalAtividade
} from '../utils/calculos.js'
import { chaveDia, intervaloDoDia } from '../utils/datas.js'

const id = useId()

// ---- Cronômetro ----

// Sem nada rodando, o painel mostra a última atividade pausada (se ainda estiver pendente),
// com o tempo congelado, pronta para retomar.
const atividadeEmPausa = computed(() => {
  if (atividadeAtiva.value) return null
  const idPausada = atividadeDaUltimaSessao(estado.sessoes)
  const atividade = estado.atividades.find((a) => a.id === idPausada)
  return atividade?.status === 'pendente' ? atividade : null
})
const atividadeDoPainel = computed(() => atividadeAtiva.value ?? atividadeEmPausa.value)
// Tempo único da atividade: soma de tudo o que já foi registrado nela.
const tempoDoPainel = computed(() =>
  atividadeDoPainel.value
    ? totalAtividade(atividadeDoPainel.value.id, estado.sessoes, estado.agora)
    : 0
)

function iniciar(atividade) {
  const resultado = iniciarAtividade(atividade.id)
  if (!resultado.ok) mostrarAviso(resultado.erro, 'erro')
}

function concluir(atividade) {
  const resultado = concluirAtividade(atividade.id)
  if (resultado.ok) mostrarAviso(`“${atividade.titulo}” concluída.`, 'sucesso')
  else mostrarAviso(resultado.erro, 'erro')
}

function reabrir(atividade) {
  const resultado = reabrirAtividade(atividade.id)
  if (resultado.ok) mostrarAviso(`“${atividade.titulo}” voltou para pendentes.`, 'sucesso')
  else mostrarAviso(resultado.erro, 'erro')
}

// ---- Nova atividade ----

const vazia = () => ({ titulo: '', descricao: '' })
const nova = ref(vazia())
const erroNova = ref('')
const campoTitulo = ref(null)

function adicionar() {
  const resultado = criarAtividade(nova.value)
  if (!resultado.ok) {
    erroNova.value = resultado.erro
    campoTitulo.value?.focus()
    return
  }
  erroNova.value = ''
  nova.value = vazia()
  mostrarAviso(`“${resultado.atividade.titulo}” adicionada às pendentes.`, 'sucesso')
  campoTitulo.value?.focus()
}

// ---- Pendentes (a do painel não se repete aqui) ----

const pendentes = computed(() =>
  estado.atividades.filter(
    (a) => a.status === 'pendente' && a.id !== atividadeDoPainel.value?.id
  )
)

function totalDe(atividade) {
  return formatarDuracao(totalAtividade(atividade.id, estado.sessoes, estado.agora))
}

// ---- Edição ----

const emEdicao = ref(null)
const edicaoAberta = ref(false)

function editar(atividade) {
  emEdicao.value = atividade
  edicaoAberta.value = true
}

// ---- Concluídas hoje ----

const hoje = computed(() => chaveDia(estado.agora))
const concluidasHoje = computed(() =>
  concluidasNoIntervalo(estado.atividades, intervaloDoDia(hoje.value))
)
</script>

<template>
  <div class="timer">
    <div class="coluna">
      <!-- Cronômetro -->
      <section
        class="painel"
        :class="{ ativo: atividadeAtiva, pausado: atividadeEmPausa }"
        :aria-labelledby="`${id}-painel`"
      >
        <template v-if="atividadeDoPainel">
          <!-- Só pendentes podem ser editadas: com a atividade rodando, é preciso pausar antes. -->
          <button
            v-if="atividadeEmPausa"
            type="button"
            class="botao botao-icone editar-painel"
            :aria-label="`Editar ${atividadeDoPainel.titulo}`"
            @click="editar(atividadeDoPainel)"
          >
            ✎
          </button>
          <p class="rotulo">{{ atividadeAtiva ? 'Em andamento' : 'Em pausa' }}</p>
          <h2 :id="`${id}-painel`" class="titulo-painel">{{ atividadeDoPainel.titulo }}</h2>
          <p v-if="atividadeDoPainel.descricao" class="detalhe">{{ atividadeDoPainel.descricao }}</p>
          <p class="cronometro" :role="atividadeAtiva ? 'timer' : undefined">
            {{ formatarCronometro(tempoDoPainel) }}
          </p>
          <div class="acoes-painel">
            <button
              v-if="atividadeAtiva"
              type="button"
              class="botao botao-contorno"
              @click="pausar"
            >
              <span aria-hidden="true">⏸</span> Pausar
            </button>
            <button
              v-else
              type="button"
              class="botao botao-primario"
              @click="iniciar(atividadeDoPainel)"
            >
              <span aria-hidden="true">▶</span> Retomar
            </button>
            <button
              type="button"
              class="botao"
              :class="atividadeAtiva ? 'botao-primario' : 'botao-contorno'"
              @click="concluir(atividadeDoPainel)"
            >
              <span aria-hidden="true">✓</span> Concluir
            </button>
          </div>
        </template>
        <template v-else>
          <h2 :id="`${id}-painel`" class="titulo-painel">Nenhuma atividade em andamento</h2>
          <p class="cronometro" aria-hidden="true">00:00:00</p>
          <p class="detalhe">Toque em ▶ em uma pendente para começar.</p>
        </template>
      </section>

      <!-- Nova atividade -->
      <section class="cartao" :aria-labelledby="`${id}-nova`">
        <h2 :id="`${id}-nova`" class="titulo-secao">Nova atividade</h2>
        <form class="formulario" novalidate @submit.prevent="adicionar">
          <div class="campo">
            <label :for="`${id}-titulo`">Título <span class="secundario">(obrigatório)</span></label>
            <input
              :id="`${id}-titulo`"
              ref="campoTitulo"
              v-model="nova.titulo"
              type="text"
              required
              :maxlength="LIMITES.titulo"
              placeholder="Código ou nome"
              autocomplete="off"
              :aria-invalid="erroNova ? 'true' : undefined"
              :aria-describedby="erroNova ? `${id}-erro-nova` : undefined"
            />
          </div>
          <div class="campo">
            <label :for="`${id}-descricao`">Descrição <span class="secundario">(opcional)</span></label>
            <textarea
              :id="`${id}-descricao`"
              v-model="nova.descricao"
              :maxlength="LIMITES.descricao"
              rows="2"
            />
          </div>
          <p v-if="erroNova" :id="`${id}-erro-nova`" class="erro-campo" role="alert">
            {{ erroNova }}
          </p>
          <button type="submit" class="botao botao-primario">Adicionar</button>
        </form>
      </section>
    </div>

    <div class="coluna">
      <!-- Pendentes -->
      <section :aria-labelledby="`${id}-pendentes`">
        <h2 :id="`${id}-pendentes`" class="titulo-secao">
          Pendentes <span class="secundario">({{ pendentes.length }})</span>
        </h2>
        <p v-if="!pendentes.length" class="secundario">Nenhuma atividade pendente.</p>
        <ul v-else class="lista-limpa lista-pendentes">
          <li v-for="atividade in pendentes" :key="atividade.id" class="cartao item-pendente">
            <div class="info">
              <h3 class="titulo-item">{{ atividade.titulo }}</h3>
              <p v-if="atividade.descricao" class="secundario descricao">{{ atividade.descricao }}</p>
              <p class="secundario meta">{{ totalDe(atividade) }}</p>
            </div>
            <div class="acoes">
              <button
                type="button"
                class="botao botao-icone botao-primario"
                :aria-label="`Iniciar ${atividade.titulo}`"
                @click="iniciar(atividade)"
              >
                ▶
              </button>
              <button
                type="button"
                class="botao botao-icone botao-contorno"
                :aria-label="`Concluir ${atividade.titulo}`"
                @click="concluir(atividade)"
              >
                ✓
              </button>
              <button
                type="button"
                class="botao botao-icone"
                :aria-label="`Editar ${atividade.titulo}`"
                @click="editar(atividade)"
              >
                ✎
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- Concluídas hoje -->
      <details class="concluidas-hoje">
        <summary>Concluídas hoje ({{ concluidasHoje.length }})</summary>
        <p v-if="!concluidasHoje.length" class="secundario">Nenhuma atividade concluída hoje.</p>
        <ul v-else class="lista-limpa lista-concluidas">
          <li v-for="atividade in concluidasHoje" :key="atividade.id">
            <AtividadeCartao
              :atividade="atividade"
              :tempo="totalAtividade(atividade.id, estado.sessoes, estado.agora)"
              @reabrir="reabrir"
              @editar="editar"
            />
          </li>
        </ul>
      </details>
    </div>

    <AtividadeDialog :aberto="edicaoAberta" :atividade="emEdicao" @fechar="edicaoAberta = false" />
  </div>
</template>

<style scoped>
.timer {
  display: grid;
  gap: 24px;
}

.coluna {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

@media (min-width: 900px) {
  .timer {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.titulo-secao {
  font-size: 1.125rem;
}

/* ---- Cronômetro ---- */

.painel {
  position: relative;
  padding: 20px;
  border: 2px solid var(--superficie-alta);
  border-radius: var(--raio);
  background: var(--superficie);
  text-align: center;
}

.painel.ativo {
  border-color: var(--laranja);
}

.painel p {
  margin: 0;
}

.rotulo {
  color: var(--texto-secundario);
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.painel.ativo .rotulo {
  color: var(--laranja);
}

.titulo-painel {
  margin: 4px 0;
  font-size: 1.25rem;
  overflow-wrap: anywhere;
}

.editar-painel {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* Espaço para o botão de editar (só na pausa) não cobrir o texto. */
.painel.pausado .rotulo,
.painel.pausado .titulo-painel {
  padding: 0 48px;
}

.detalhe {
  color: var(--texto-secundario);
  overflow-wrap: anywhere;
}

.painel .cronometro {
  margin: 12px 0 8px;
  font-family: var(--fonte-numeros);
  font-size: clamp(3rem, 15vw, 5rem);
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: var(--texto-secundario);
}

.painel.ativo .cronometro {
  color: var(--laranja);
}

.painel.pausado .cronometro {
  color: var(--texto);
}

.acoes-painel {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.acoes-painel .botao {
  flex: 1;
  max-width: 200px;
}

/* ---- Pendentes ---- */

.lista-pendentes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-pendente {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 16px;
}

.info {
  flex: 1;
  min-width: 0;
}

.info p {
  margin: 0;
}

.titulo-item {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.descricao {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.meta {
  font-size: 0.875rem;
}

.acoes {
  display: flex;
  gap: 8px;
}

/* ---- Concluídas hoje ---- */

.concluidas-hoje summary {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  min-height: var(--toque);
  padding: 0 12px;
  border-radius: var(--raio-pequeno);
  background: var(--superficie);
  font-weight: 600;
  cursor: pointer;
}

.concluidas-hoje summary::-webkit-details-marker {
  display: none;
}

.concluidas-hoje summary::before {
  content: '▸';
  transition: transform 0.15s;
}

.concluidas-hoje[open] summary::before {
  transform: rotate(90deg);
}

.concluidas-hoje > .secundario {
  margin: 12px 0 0;
}

.lista-concluidas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
</style>
