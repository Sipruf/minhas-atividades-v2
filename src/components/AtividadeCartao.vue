<script setup>
// Cartão de atividade concluída: título, descrição, tempo total, data de conclusão,
// Reabrir e Editar. Quem trata os eventos é a tela.
import { formatarDuracao } from '../utils/calculos.js'
import { formatarDataHora } from '../utils/datas.js'

defineProps({
  atividade: { type: Object, required: true },
  tempo: { type: Number, default: 0 }
})
const emit = defineEmits(['editar', 'reabrir'])
</script>

<template>
  <article class="cartao cartao-atividade">
    <h3 class="titulo">{{ atividade.titulo }}</h3>
    <p v-if="atividade.descricao" class="secundario descricao">{{ atividade.descricao }}</p>

    <p class="tempo">
      <span class="visualmente-oculto">Tempo total: </span>{{ formatarDuracao(tempo) }}
    </p>
    <p v-if="atividade.concluidoEm" class="secundario conclusao">
      Concluída em {{ formatarDataHora(atividade.concluidoEm) }}
    </p>

    <div class="acoes">
      <button
        type="button"
        class="botao botao-contorno"
        :aria-label="`Reabrir ${atividade.titulo}`"
        @click="emit('reabrir', atividade)"
      >
        <span aria-hidden="true">↺</span> Reabrir
      </button>
      <button
        type="button"
        class="botao botao-icone"
        :aria-label="`Editar ${atividade.titulo}`"
        @click="emit('editar', atividade)"
      >
        ✎
      </button>
    </div>
  </article>
</template>

<style scoped>
.cartao-atividade {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cartao-atividade p {
  margin: 0;
}

.titulo {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.descricao {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.9375rem;
  overflow-wrap: anywhere;
}

.tempo {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.conclusao {
  font-size: 0.875rem;
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
</style>
