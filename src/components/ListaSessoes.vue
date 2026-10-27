<script setup>
// Lista de registros: um por atividade por dia, com data, horário, tempo, ajustar (✎) e excluir (🗑).
// Os diálogos de ajuste e de confirmação ficam aqui dentro.
import { computed, ref } from 'vue'
import ConfirmarDialog from './ConfirmarDialog.vue'
import SessaoDialog from './SessaoDialog.vue'
import { estado, excluirTempoNoDia, mostrarAviso } from '../store/estado.js'
import { formatarDuracao } from '../utils/calculos.js'
import { formatarData, formatarDiaMes, formatarHora, nomeDiaSemana } from '../utils/datas.js'

defineProps({
  // Itens de registrosDoIntervalo: { chave, dia, atividadeId, inicio, fim, ms }
  registros: { type: Array, required: true },
  vazio: { type: String, default: 'Nenhum registro.' },
  // false quando a lista já está dentro do dia (a data não se repete em cada linha).
  mostrarDia: { type: Boolean, default: true }
})

function tituloDe(registro) {
  return estado.atividades.find((a) => a.id === registro.atividadeId)?.titulo ?? '(sem atividade)'
}

function quando(registro) {
  return `${nomeDiaSemana(registro.dia)} ${formatarDiaMes(registro.dia)}`
}

// Do primeiro início ao último fim do dia ("agora" se ainda está rodando).
function horario(registro) {
  const fim = registro.fim === null ? 'agora' : formatarHora(registro.fim)
  return `${formatarHora(registro.inicio)}–${fim}`
}

// Ajuste
const emAjuste = ref(null)
const ajusteAberto = ref(false)

function ajustar(registro) {
  emAjuste.value = registro
  ajusteAberto.value = true
}

// Exclusão
const paraExcluir = ref(null)
const exclusaoAberta = ref(false)
const mensagemExclusao = computed(() => {
  const r = paraExcluir.value
  if (!r) return ''
  const dia = nomeDiaSemana(r.dia, true)
  const linhas = [
    `Todo o tempo de “${tituloDe(r)}” em ${dia}, ${formatarData(r.dia)} (${formatarDuracao(r.ms)}) será excluído.`
  ]
  if (r.fim === null) linhas.push('O cronômetro dela será parado.')
  linhas.push('Esta ação não pode ser desfeita.')
  return linhas.join('\n')
})

function pedirExclusao(registro) {
  paraExcluir.value = registro
  exclusaoAberta.value = true
}

function confirmarExclusao() {
  excluirTempoNoDia(paraExcluir.value.atividadeId, paraExcluir.value.dia)
  exclusaoAberta.value = false
  mostrarAviso('Registro excluído.', 'sucesso')
}
</script>

<template>
  <p v-if="!registros.length" class="secundario">{{ vazio }}</p>
  <ul v-else class="lista-limpa lista-registros">
    <li
      v-for="registro in registros"
      :key="registro.chave"
      class="item-registro"
      :class="{ 'em-andamento': registro.fim === null }"
    >
      <div class="info">
        <span class="quando">
          <template v-if="mostrarDia">{{ quando(registro) }} · </template>{{ horario(registro) }}
        </span>
        <span class="titulo">
          {{ tituloDe(registro) }}
          <span v-if="registro.fim === null" class="selo">em andamento</span>
        </span>
      </div>
      <span class="duracao">{{ formatarDuracao(registro.ms) }}</span>
      <div class="acoes">
        <!-- Rodando não se ajusta: é preciso pausar antes. O espaço fica reservado para alinhar. -->
        <button
          v-if="registro.fim !== null"
          type="button"
          class="botao botao-icone"
          :aria-label="`Ajustar tempo de ${tituloDe(registro)} em ${quando(registro)}`"
          @click="ajustar(registro)"
        >
          ✎
        </button>
        <span v-else aria-hidden="true" />
        <button
          type="button"
          class="botao botao-icone"
          :aria-label="`Excluir tempo de ${tituloDe(registro)} em ${quando(registro)}`"
          @click="pedirExclusao(registro)"
        >
          🗑
        </button>
      </div>
    </li>
  </ul>

  <SessaoDialog :aberto="ajusteAberto" :registro="emAjuste" @fechar="ajusteAberto = false" />

  <ConfirmarDialog
    :aberto="exclusaoAberta"
    titulo="Excluir registro?"
    :mensagem="mensagemExclusao"
    texto-confirmar="Excluir registro"
    perigo
    @confirmar="confirmarExclusao"
    @cancelar="exclusaoAberta = false"
  />
</template>

<style scoped>
.lista-registros {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-registro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 16px;
  border-radius: var(--raio-pequeno);
  background: var(--superficie);
}

.item-registro.em-andamento {
  box-shadow: inset 4px 0 0 var(--laranja);
}

.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.quando {
  font-size: 0.875rem;
  color: var(--texto-secundario);
  font-variant-numeric: tabular-nums;
}

.titulo {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.duracao {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.acoes {
  display: grid;
  grid-template-columns: var(--toque) var(--toque);
  gap: 4px;
}
</style>
