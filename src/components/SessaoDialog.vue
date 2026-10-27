<script setup>
// Ajusta o tempo de uma atividade num dia (um registro da lista). Ver ajustarTempoDoDia.
import { computed, ref, useId, watch } from 'vue'
import BaseDialog from './BaseDialog.vue'
import { ajustarTempoNoDia, estado, mostrarAviso } from '../store/estado.js'
import { formatarData, nomeDiaSemana } from '../utils/datas.js'

const HORA = 3600000
const MINUTO = 60000

const props = defineProps({
  aberto: { type: Boolean, default: false },
  // { dia, atividadeId, ms, ... } de registrosDoIntervalo
  registro: { type: Object, default: null }
})
const emit = defineEmits(['fechar'])

const id = useId()
const campos = ref({ horas: '0', minutos: '0' })
const original = ref({ horas: '0', minutos: '0' })
const erro = ref('')

const titulo = computed(
  () => estado.atividades.find((a) => a.id === props.registro?.atividadeId)?.titulo ?? ''
)
const rotuloDia = computed(() => {
  if (!props.registro) return ''
  const dia = nomeDiaSemana(props.registro.dia, true)
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${formatarData(props.registro.dia)}`
})

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto || !props.registro) return
    erro.value = ''
    const ms = props.registro.ms
    original.value = {
      horas: String(Math.floor(ms / HORA)),
      minutos: String(Math.floor((ms % HORA) / MINUTO))
    }
    campos.value = { ...original.value }
  },
  { immediate: true }
)

// Só dígitos, com no máximo `limite` caracteres (inclusive ao colar).
function aceitarDigitos(evento, campo, limite) {
  const limpo = evento.target.value.replace(/\D/g, '').slice(0, limite)
  evento.target.value = limpo
  campos.value[campo] = limpo
}

function salvar() {
  const h = Number(campos.value.horas || 0)
  const m = Number(campos.value.minutos || 0)
  // Sem mudança, não mexe em nada (o campo não mostra segundos).
  if (h === Number(original.value.horas) && m === Number(original.value.minutos)) {
    emit('fechar')
    return
  }
  if (m > 59) {
    erro.value = 'Os minutos vão de 0 a 59.'
    return
  }
  if (h > 24 || (h === 24 && m > 0)) {
    erro.value = 'Um dia tem no máximo 24 horas.'
    return
  }
  const resultado = ajustarTempoNoDia(props.registro.atividadeId, props.registro.dia, h * HORA + m * MINUTO)
  if (!resultado.ok) {
    erro.value = resultado.erro
    return
  }
  mostrarAviso('Tempo ajustado.', 'sucesso')
  emit('fechar')
}
</script>

<template>
  <BaseDialog :aberto="aberto" titulo="Ajustar tempo do dia" @fechar="emit('fechar')">
    <form class="formulario" novalidate @submit.prevent="salvar">
      <p>
        <strong>{{ titulo }}</strong><br />
        <span class="secundario">{{ rotuloDia }}</span>
      </p>

      <fieldset class="campo-tempo" :aria-describedby="`${id}-dica`">
        <legend>Tempo no dia</legend>
        <div class="tempo-linha">
          <div class="campo">
            <label :for="`${id}-horas`">Horas</label>
            <input
              :id="`${id}-horas`"
              :value="campos.horas"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="2"
              autocomplete="off"
              autofocus
              @input="aceitarDigitos($event, 'horas', 2)"
            />
          </div>
          <div class="campo">
            <label :for="`${id}-minutos`">Minutos</label>
            <input
              :id="`${id}-minutos`"
              :value="campos.minutos"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="2"
              autocomplete="off"
              @input="aceitarDigitos($event, 'minutos', 2)"
            />
          </div>
        </div>
        <span :id="`${id}-dica`" class="dica">
          Ao reduzir, o tempo sai do fim do dia; ao aumentar, entra junto aos horários já
          registrados nesse dia. Zerar apaga o registro.
        </span>
      </fieldset>

      <p v-if="erro" class="erro-campo" role="alert">{{ erro }}</p>

      <div class="dialogo-acoes">
        <button type="button" class="botao botao-contorno" @click="emit('fechar')">Cancelar</button>
        <button type="submit" class="botao botao-primario">Salvar</button>
      </div>
    </form>
  </BaseDialog>
</template>

<style scoped>
.formulario p {
  margin: 0;
}

.campo-tempo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.campo-tempo legend {
  padding: 0;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 0.9375rem;
}

.tempo-linha {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tempo-linha label {
  font-weight: 400;
  color: var(--texto-secundario);
}

.dica {
  font-size: 0.875rem;
  color: var(--texto-secundario);
}
</style>
