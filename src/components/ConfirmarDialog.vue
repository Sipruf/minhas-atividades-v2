<script setup>
// Substitui o confirm() nativo. O foco começa em "Cancelar", a opção segura.
import BaseDialog from './BaseDialog.vue'

defineProps({
  aberto: { type: Boolean, default: false },
  titulo: { type: String, required: true },
  mensagem: { type: String, default: '' },
  textoConfirmar: { type: String, default: 'Confirmar' },
  perigo: { type: Boolean, default: false }
})
const emit = defineEmits(['confirmar', 'cancelar'])
</script>

<template>
  <BaseDialog :aberto="aberto" :titulo="titulo" @fechar="emit('cancelar')">
    <p v-if="mensagem" class="mensagem">{{ mensagem }}</p>
    <slot />
    <div class="dialogo-acoes">
      <button type="button" class="botao botao-contorno" autofocus @click="emit('cancelar')">
        Cancelar
      </button>
      <button
        type="button"
        class="botao"
        :class="perigo ? 'botao-perigo' : 'botao-primario'"
        @click="emit('confirmar')"
      >
        {{ textoConfirmar }}
      </button>
    </div>
  </BaseDialog>
</template>

<style scoped>
.mensagem {
  margin: 0 0 8px;
  white-space: pre-line;
}
</style>
