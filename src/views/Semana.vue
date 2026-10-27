<script setup>
// Resumo da semana útil recebida (exibido na aba Dados): total e horas por dia (cada dia abre as
// atividades concluídas nele). O relatório em texto fica em "Backup e Relatório", na própria aba.
import { computed, ref, useId, watch } from 'vue'
import { estado } from '../store/estado.js'
import {
  concluidasNoIntervalo,
  formatarDuracao,
  somaPorDia,
  totaisPorAtividade,
  totalNoIntervalo
} from '../utils/calculos.js'
import { chaveDia, formatarDiaMes, intervaloDaSemana, intervaloDoDia, nomeDiaSemana } from '../utils/datas.js'

const props = defineProps({
  // { inicio, fim, dias } como devolvido por semanaDe
  semana: { type: Object, required: true }
})

const id = useId()

const intervalo = computed(() => intervaloDaSemana(props.semana))
const hoje = computed(() => chaveDia(estado.agora))
const total = computed(() => totalNoIntervalo(estado.sessoes, intervalo.value, estado.agora))
const totais = computed(() => totaisPorAtividade(estado.sessoes, estado.agora))

const dias = computed(() => {
  const soma = somaPorDia(estado.sessoes, props.semana.dias, estado.agora)
  return props.semana.dias.map((dia) => ({
    dia,
    ms: soma[dia],
    concluidas: concluidasNoIntervalo(estado.atividades, intervaloDoDia(dia))
  }))
})

// Dias abertos no acordeão; ao trocar de semana, tudo volta fechado.
const abertos = ref(new Set())
watch(
  () => props.semana.inicio,
  () => {
    abertos.value = new Set()
  }
)

function alternar(dia) {
  const novos = new Set(abertos.value)
  if (novos.has(dia)) novos.delete(dia)
  else novos.add(dia)
  abertos.value = novos
}
</script>

<template>
  <section class="semana" :aria-labelledby="`${id}-titulo`">
    <div class="cabecalho-semana">
      <h2 :id="`${id}-titulo`" class="titulo-secao">Semana</h2>
      <p class="total-semana">
        <span class="secundario">Total</span>
        <strong>{{ formatarDuracao(total) }}</strong>
      </p>
    </div>

    <h3 class="subtitulo">Horas por dia</h3>
    <ul class="lista-limpa lista-dias">
      <li v-for="item in dias" :key="item.dia" class="acordeao" :class="{ hoje: item.dia === hoje }">
        <button
          type="button"
          class="acordeao-cabecalho"
          :aria-expanded="abertos.has(item.dia) ? 'true' : 'false'"
          :aria-controls="abertos.has(item.dia) ? `${id}-dia-${item.dia}` : undefined"
          @click="alternar(item.dia)"
        >
          <span class="acordeao-seta" aria-hidden="true">▸</span>
          <span class="rotulo-dia">
            {{ nomeDiaSemana(item.dia) }} <span class="secundario">{{ formatarDiaMes(item.dia) }}</span>
          </span>
          <span v-if="item.concluidas.length" class="secundario qtd-concluidas">
            {{ item.concluidas.length }} {{ item.concluidas.length === 1 ? 'concluída' : 'concluídas' }}
          </span>
          <span class="valor" :class="{ zero: !item.ms }">{{ formatarDuracao(item.ms) }}</span>
        </button>
        <div v-if="abertos.has(item.dia)" :id="`${id}-dia-${item.dia}`" class="acordeao-conteudo">
          <p v-if="!item.concluidas.length" class="secundario">
            Nenhuma atividade concluída neste dia.
          </p>
          <ul v-else class="lista-limpa lista-concluidas">
            <li v-for="atividade in item.concluidas" :key="atividade.id">
              <span class="titulo-atividade">{{ atividade.titulo }}</span>
              <span class="valor">{{ formatarDuracao(totais.get(atividade.id) ?? 0) }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.semana {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.semana p {
  margin: 0;
}

.cabecalho-semana {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.titulo-secao {
  margin: 0;
  font-size: 1.125rem;
}

.total-semana {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 1.25rem;
  line-height: 1.2;
}

.total-semana .secundario {
  font-size: 0.8125rem;
}

.subtitulo {
  margin: 8px 0 0;
  font-size: 1rem;
}

/* Dia e concluídas usam as mesmas colunas: seta | título | (qtd. concluídas) | tempo.
   Assim os títulos ficam sob o nome do dia e os tempos sob o total do dia. */
.lista-dias {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lista-dias .acordeao-cabecalho {
  display: grid;
  grid-template-columns: 1rem minmax(0, 1fr) auto auto;
}

.acordeao-cabecalho .qtd-concluidas {
  grid-column: 3;
}

.acordeao-cabecalho .valor {
  grid-column: 4;
}

.lista-dias .acordeao-conteudo {
  padding: 0 0 4px;
}

/* Texto de dia vazio alinhado com os títulos. */
.acordeao-conteudo > p {
  padding: 8px 12px 8px calc(1rem + 24px);
  border-top: 1px solid var(--superficie-alta);
}

.hoje .rotulo-dia {
  color: var(--laranja);
  font-weight: 700;
}

.qtd-concluidas {
  font-size: 0.875rem;
  white-space: nowrap;
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

.lista-concluidas li {
  display: grid;
  grid-template-columns: 1rem minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--superficie-alta);
}

.lista-concluidas .titulo-atividade {
  grid-column: 2;
}

.titulo-atividade {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
