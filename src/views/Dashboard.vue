<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const searchQuery = ref('');

const onSearch = () => {
  // Ubah query dari 'q' menjadi 'search'
  router.push({ path: '/lihat-riwayat', query: { search: searchQuery.value } });
};
</script>

<template>
  <a-card bordered style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center;">
    
    <h2 style="font-size: 26px; font-weight: 600; margin-bottom: 30px; color: #1a202c;">
      TEMPE DELE<br>Sistem Pengelolaan Dokumen Rekam Medis Inaktif
    </h2>

    <a-button 
      type="primary" 
      size="large" 
      style="background-color: #198754; border-color: #198754; font-weight: 500; margin-bottom: 40px;"
      @click="router.push('/tambah-riwayat')"
    >
      Tambah Dokumen
    </a-button>

    <a-divider />

    <div style="max-width: 500px; margin: 0 auto; padding-top: 20px;">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Ketik untuk mencari..."
        enter-button="Cari"
        size="large"
        @search="onSearch"
      />
    </div>

  </a-card>
</template>