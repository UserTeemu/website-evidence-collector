import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import Vueform from '@vueform/vueform'
import vueformConfig from './../vueform.config'
import EvidenceCollectorForm from "./components/EvidenceCollectorForm.vue";
import PreviousScansView from "./components/PreviousScansView.vue";
import {createRouter, createWebHistory} from "vue-router";

const routes = [
    { path: '/', component: EvidenceCollectorForm   } ,
    { path: '/previous-scans', component: PreviousScansView },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App)
app.use(Vueform, vueformConfig)
app.use(router)
app.mount('#app')