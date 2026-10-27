import { createApp } from 'vue'
import App from './App.vue'
import { iniciarStore } from './store/estado.js'
import './estilos.css'

iniciarStore()
createApp(App).mount('#app')
