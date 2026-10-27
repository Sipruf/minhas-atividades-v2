<script setup>
// Edita título, descrição e tempo total de uma atividade. Também permite excluí-la (com confirmação).
import { computed, ref, useId, watch } from 'vue'
import BaseDialog from './BaseDialog.vue'
import ConfirmarDialog from './ConfirmarDialog.vue'
import {
  ajustarTempoAtividade,
  editarAtividade,
  estado,
  excluirAtividade,
  LIMITES,
  mostrarAviso,
  sessaoAtiva
} from '../store/estado.js'
import { formatarDuracao, totalAtividade } from '../utils/calculos.js'

const props = defineProps({
  aberto: { type: Boolean, default: false },
  atividade: { type: Object, default: null }
})
const emit = defineEmits(['fechar'])

const HORA = 3600000
const MINUTO = 60000

const id = useId()
const campos = ref({ titulo: '', descricao: '', horas: 0, minutos: 0 })
const tempoOriginal = ref({ horas: 0, minutos: 0 })
const erro = ref('')
const confirmacaoAberta = ref(false)

const rodando = computed(() => sessaoAtiva.value?.atividadeId === props.atividade?.id)

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto || !props.atividade) return
    erro.value = ''
    confirmacaoAberta.value = false
    const total = totalAtividade(props.atividade.id, estado.sessoes, Date.now())
    tempoOriginal.value = {
      horas: String(Math.floor(total / HORA)),
      minutos: String(Math.floor((total % HORA) / MINUTO))
    }
    campos.value = {
      titulo: props.atividade.titulo,
      descricao: props.atividade.descricao ?? '',
      ...tempoOriginal.value
    }
  },
  { immediate: true }
)

const resumoExclusao = computed(() => {
  const atividade = props.atividade
  if (!atividade) return ''
  const linhas = [`“${atividade.titulo}” será excluída.`]
  const quantidade = estado.sessoes.filter((s) => s.atividadeId === atividade.id).length
  if (quantidade) {
    const total = formatarDuracao(totalAtividade(atividade.id, estado.sessoes, estado.agora))
    const sessoes = quantidade === 1 ? '1 sessão' : `${quantidade} sessões`
    linhas.push(`Também serão excluídas ${sessoes} (${total} registrados).`)
  }
  if (sessaoAtiva.value?.atividadeId === atividade.id) {
    linhas.push('O cronômetro dela será parado.')
  }
  linhas.push('Esta ação não pode ser desfeita.')
  return linhas.join('\n')
})

// Os campos de tempo aceitam só dígitos, com no máximo `limite` caracteres (inclusive ao colar).
function aceitarDigitos(evento, campo, limite) {
  const limpo = evento.target.value.replace(/\D/g, '').slice(0, limite)
  evento.target.value = limpo
  campos.value[campo] = limpo
}

function salvar() {
  const { titulo, descricao, horas, minutos } = campos.value
  if (!String(titulo).trim()) {
    erro.value = 'Informe o título da atividade.'
    return
  }

  // O tempo só é ajustado se a pessoa mexeu nele (o campo não mostra segundos).
  const h = Number(horas || 0)
  const m = Number(minutos || 0)
  const tempoMudou =
    h !== Number(tempoOriginal.value.horas) || m !== Number(tempoOriginal.value.minutos)
  if (tempoMudou) {
    if (m > 59) {
      erro.value = 'Os minutos vão de 0 a 59.'
      return
    }
    const ajuste = ajustarTempoAtividade(props.atividade.id, h * HORA + m * MINUTO)
    if (!ajuste.ok) {
      erro.value = ajuste.erro
      return
    }
  }

  editarAtividade(props.atividade.id, { titulo, descricao })
  mostrarAviso('Atividade atualizada.', 'sucesso')
  emit('fechar')
}

function confirmarExclusao() {
  const titulo = props.atividade.titulo
  excluirAtividade(props.atividade.id)
  confirmacaoAberta.value = false
  emit('fechar')
  mostrarAviso(`“${titulo}” excluída.`, 'sucesso')
}
</script>

<template>
  <BaseDialog :aberto="aberto" titulo="Editar atividade" @fechar="emit('fechar')">
    <form class="formulario" novalidate @submit.prevent="salvar">
      <div class="campo">
        <label :for="`${id}-titulo`">Título <span class="secundario">(obrigatório)</span></label>
        <input
          :id="`${id}-titulo`"
          v-model="campos.titulo"
          type="text"
          required
          :maxlength="LIMITES.titulo"
          autocomplete="off"
          autofocus
          :aria-invalid="erro ? 'true' : undefined"
          :aria-describedby="erro ? `${id}-erro` : undefined"
        />
      </div>
      <div class="campo">
        <label :for="`${id}-descricao`">Descrição <span class="secundario">(opcional)</span></label>
        <textarea
          :id="`${id}-descricao`"
          v-model="campos.descricao"
          :maxlength="LIMITES.descricao"
          rows="3"
        />
      </div>

      <fieldset class="campo-tempo" :disabled="rodando" :aria-describedby="`${id}-dica-tempo`">
        <legend>Tempo total</legend>
        <div class="tempo-linha">
          <div class="campo">
            <label :for="`${id}-horas`">Horas</label>
            <input
              :id="`${id}-horas`"
              :value="campos.horas"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="3"
              autocomplete="off"
              @input="aceitarDigitos($event, 'horas', 3)"
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
        <span :id="`${id}-dica-tempo`" class="dica">
          {{
            rodando
              ? 'Pause a atividade para ajustar o tempo.'
              : 'Ao reduzir, o tempo sai dos registros mais recentes; ao aumentar, entra junto aos registros desta atividade.'
          }}
        </span>
      </fieldset>

      <p v-if="erro" :id="`${id}-erro`" class="erro-campo" role="alert">{{ erro }}</p>

      <div class="rodape">
        <button type="button" class="botao botao-excluir" @click="confirmacaoAberta = true">
          Excluir atividade
        </button>
        <div class="dialogo-acoes">
          <button type="button" class="botao botao-contorno" @click="emit('fechar')">Cancelar</button>
          <button type="submit" class="botao botao-primario">Salvar</button>
        </div>
      </div>
    </form>
  </BaseDialog>

  <ConfirmarDialog
    :aberto="confirmacaoAberta"
    titulo="Excluir atividade?"
    :mensagem="resumoExclusao"
    texto-confirmar="Excluir atividade"
    perigo
    @confirmar="confirmarExclusao"
    @cancelar="confirmacaoAberta = false"
  />
</template>

<style scoped>
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

.campo-tempo:disabled {
  opacity: 0.6;
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

.rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
}

.rodape .dialogo-acoes {
  margin-top: 0;
}

.botao-excluir {
  background: transparent;
  border-color: var(--perigo-texto);
  color: var(--perigo-texto);
}
</style>
