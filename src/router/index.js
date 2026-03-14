import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'tambah-riwayat', name: 'TambahRiwayat', component: () => import('../views/TambahRiwayat.vue') },
      { path: 'lihat-riwayat', name: 'LihatRiwayat', component: () => import('../views/LihatRiwayat.vue') },
      { path: 'edit-riwayat/:id', name: 'EditRiwayat', component: () => import('../views/EditRiwayat.vue') },
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Proteksi Halaman (Harus Login)
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token');
  if (to.name !== 'Login' && to.name !== 'Register' && !isAuthenticated) next({ name: 'Login' });
  else next();
});

export default router;