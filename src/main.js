import { createApp } from 'vue';
import App from './App.vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import router from './router/index.js'; 
import axios from 'axios';

// 1. Set Base URL Laravel agar lebih singkat saat dipanggil di Vue
const apiUrl = window.APP_CONFIG?.API_URL;

axios.defaults.baseURL = apiUrl;

// Tambahkan ini untuk memastikan semua request lewat satu pintu
axios.interceptors.request.use((config) => {
  config.baseURL = window.APP_CONFIG?.API_URL || apiUrl;
  return config;
});

// 2. Pasang AXIOS INTERCEPTOR (Satpam Otomatis)
axios.interceptors.request.use(
  (config) => {
    // Ambil token internal Laravel dari user yang sedang login
    const token = localStorage.getItem('token');
    
    // Jika token ada, selipkan ke dalam Header Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    config.headers['Accept'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const app = createApp(App);
app.use(Antd);
app.use(router);
app.mount('#app');