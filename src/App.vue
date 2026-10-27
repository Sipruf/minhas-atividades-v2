<script setup>
import { computed, ref } from 'vue'
import { version } from '../package.json'
import AvisoTela from './components/AvisoTela.vue'
import Dados from './views/Dados.vue'
import Timer from './views/Timer.vue'

const abas = [
  { id: 'timer', rotulo: 'Timer' },
  { id: 'dados', rotulo: 'Dados' }
]

const telas = { timer: Timer, dados: Dados }

const abaAtual = ref('timer')
const telaAtual = computed(() => telas[abaAtual.value])
</script>

<template>
  <header class="cabecalho">
    <div class="cabecalho-interno">
      <h1 class="titulo-app">
        Minhas atividades <span class="versao">v{{ version }}</span>
      </h1>
      <nav class="abas" aria-label="Seções">
        <button
          v-for="aba in abas"
          :key="aba.id"
          type="button"
          class="aba"
          :aria-current="abaAtual === aba.id ? 'page' : undefined"
          @click="abaAtual = aba.id"
        >
          {{ aba.rotulo }}
        </button>
      </nav>
    </div>
  </header>

  <main class="conteudo">
    <!-- KeepAlive preserva o que foi digitado ao trocar de aba. -->
    <KeepAlive>
      <component :is="telaAtual" />
    </KeepAlive>
  </main>

  <AvisoTela />
</template>
