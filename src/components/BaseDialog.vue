<script setup>
// Diálogo modal com <dialog> nativo: prende o foco, fecha com Esc e é controlado pela prop "aberto".
import { onMounted, ref, useId, watch } from 'vue'

const props = defineProps({
  aberto: { type: Boolean, default: false },
  titulo: { type: String, required: true }
})
const emit = defineEmits(['fechar'])

const dialogo = ref(null)
const idTitulo = useId()

function sincronizar(aberto) {
  const el = dialogo.value
  if (!el) return
  if (aberto && !el.open) el.showModal()
  else if (!aberto && el.open) el.close()
}

// flush 'post': abre depois de o conteúdo ser atualizado, para o autofocus cair no campo certo.
watch(() => props.aberto, sincronizar, { flush: 'post' })
onMounted(() => sincronizar(props.aberto))

// Esc: quem decide fechar é o componente pai.
function aoCancelar(evento) {
  evento.preventDefault()
  emit('fechar')
}

// Se o navegador fechar o diálogo por conta própria, avisa o pai para manter o estado coerente.
function aoFechar() {
  if (props.aberto) emit('fechar')
}
</script>

<template>
  <dialog
    ref="dialogo"
    class="dialogo"
    :aria-labelledby="idTitulo"
    @cancel="aoCancelar"
    @close="aoFechar"
  >
    <div class="dialogo-cabecalho">
      <h2 :id="idTitulo">{{ titulo }}</h2>
      <button type="button" class="botao botao-icone" aria-label="Fechar" @click="emit('fechar')">
        ✕
      </button>
    </div>
    <div class="dialogo-corpo">
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.dialogo {
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: 1px solid var(--superficie-alta);
  border-radius: var(--raio);
  background: var(--superficie);
  color: var(--texto);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.dialogo::backdrop {
  background: rgba(0, 0, 0, 0.7);
}

.dialogo-cabecalho {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 0 20px;
}

.dialogo-cabecalho h2 {
  margin: 0;
  font-size: 1.125rem;
}

.dialogo-corpo {
  padding: 12px 20px 20px;
}
</style>
