<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { message } from 'ant-design-vue';

const router = useRouter();
const isLoading = ref(false);

const formState = reactive({
  name: '',
  username: '',
  password: '',
  confirmPassword: ''
});

// Custom Validator untuk mengecek konfirmasi password
const validatePass2 = async (_rule, value) => {
  if (value === '') return Promise.reject('Mohon konfirmasi password Anda!');
  if (value !== formState.password) return Promise.reject('Password tidak sama!');
  return Promise.resolve();
};

const handleRegister = async () => {
  isLoading.value = true;
  try {
    const apiLaravelUrl = (window.APP_CONFIG?.API_URL || "").replace(/\/$/, '');
    
    // Tembak API registerUser Anda
    const response = await axios.post(`${apiLaravelUrl}/register`, {
      name: formState.name,
      username: formState.username,
      password: formState.password
    });

    if (response.data.status === 'success') {
      message.success('Registrasi berhasil! Silakan login.');
      router.push('/login');
    }
  } catch (error) {
    // Tangkap error validasi dari Laravel (422)
    if (error.response && error.response.status === 422) {
      const errors = error.response.data.errors;
      // Tampilkan pesan error pertama (misal: "Username telah digunakan")
      const firstKey = Object.keys(errors)[0];
      message.error(errors[firstKey][0]);
    } else {
      message.error('Terjadi kesalahan saat pendaftaran.');
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5;">
    <a-card title="Daftar Akun Baru" style="width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <a-form layout="vertical" :model="formState" @finish="handleRegister">
        
        <a-form-item label="Nama Lengkap" name="name" :rules="[{ required: true, message: 'Nama tidak boleh kosong!' }]">
          <a-input v-model:value="formState.name" size="large" />
        </a-form-item>

        <a-form-item label="Username" name="username" :rules="[{ required: true, message: 'Username tidak boleh kosong!' }]">
          <a-input v-model:value="formState.username" size="large" />
        </a-form-item>
        
        <a-form-item 
          label="Password" 
          name="password" 
          :rules="[
            { required: true, message: 'Password wajib diisi!' },
            { min: 6, message: 'Password minimal 6 karakter!' }
          ]"
        >
          <a-input-password v-model:value="formState.password" size="large" />
        </a-form-item>

        <a-form-item label="Konfirmasi Password" name="confirmPassword" :rules="[{ validator: validatePass2 }]">
          <a-input-password v-model:value="formState.confirmPassword" size="large" />
        </a-form-item>

        <a-button type="primary" html-type="submit" block size="large" :loading="isLoading" style="margin-top: 10px;">
          Daftar Sekarang
        </a-button>
        
        <div style="text-align: center; margin-top: 15px;">
          Sudah punya akun? <a @click="router.push('/login')">Kembali ke Login</a>
        </div>
      </a-form>
    </a-card>
  </div>
</template>