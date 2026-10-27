<script setup>
// Mensagem temporária na tela (substitui o alert nativo). O texto vem de estado.aviso.
import { estado, fecharAviso } from '../store/estado.js'
</script>

<template>
  <div aria-live="polite">
    <div
      v-if="estado.aviso"
      class="aviso"
      :class="`aviso-${estado.aviso.tipo}`"
      :role="estado.aviso.tipo === 'erro' ? 'alert' : undefined"
    >
      <span>{{ estado.aviso.texto }}</span>
      <button type="button" class="botao botao-icone" aria-label="Fechar aviso" @click="fecharAviso">
        ✕
      </button>
    </div>
  </div>
</template>
