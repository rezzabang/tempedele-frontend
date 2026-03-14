<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const userName = ref('');

onMounted(() => {
  userName.value = localStorage.getItem('user_name_login') || 'Pengguna';
});

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user_name_login');
  router.push('/login');
};
</script>

<template>
  <a-layout style="min-height: 100vh; background: #fafafa;">
    <a-layout-header style="background: #fff; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eaeaea;">
      
      <div 
        style="font-size: 18px; font-weight: 500; color: #333; cursor: pointer;" 
        @click="router.push('/dashboard')"
        title="Kembali ke Dashboard"
      >
        {{ userName }}
      </div>

      <a-button danger shape="round" @click="handleLogout" style="min-width: 90px;">
        Logout
      </a-button>
    </a-layout-header>

    <a-layout-content style="padding: 40px 20px; display: flex; justify-content: center;">
      <div style="width: 100%; max-width: 800px;">
        <router-view /> 
      </div>
    </a-layout-content>

    <a-layout-footer style="text-align: center; background: transparent; padding-bottom: 20px;">
      © 2026 Created with ❤️
    </a-layout-footer>
  </a-layout>
</template>