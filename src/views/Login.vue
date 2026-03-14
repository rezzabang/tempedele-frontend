<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { message } from 'ant-design-vue';

const router = useRouter();
const isLoading = ref(false);

const formState = reactive({ username: '', password: '', captchaAnswer: '' });

// CAPTCHA LOGIC
const captcha = reactive({ num1: 0, num2: 0, result: 0 });
const generateCaptcha = () => {
  captcha.num1 = Math.floor(Math.random() * 10) + 1;
  captcha.num2 = Math.floor(Math.random() * 10) + 1;
  captcha.result = captcha.num1 + captcha.num2;
};

onMounted(() => generateCaptcha());

const handleLogin = async () => {
  if (parseInt(formState.captchaAnswer) !== captcha.result) {
    message.error('Jawaban Captcha salah!');
    generateCaptcha(); 
    formState.captchaAnswer = '';
    return;
  }

  isLoading.value = true;
  try {
    // URL Cukup ditulis '/login' karena http://127... sudah dikelola global
    const response = await axios.post(`/login`, {
      username: formState.username,
      password: formState.password
    });

    if (response.data.status === 'success') {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user_name_login', response.data.data.name); 
      
      message.success(response.data.message);
      router.push('/'); 
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      message.error(error.response.data.message); 
    } else {
      message.error('Gagal terhubung ke server.');
    }
    generateCaptcha(); 
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5;">
    <a-card title="Login" :headStyle="{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }" style="width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <a-form layout="vertical" :model="formState" @finish="handleLogin">
        <a-form-item label="Username" name="username" :rules="[{ required: true, message: 'Wajib diisi!' }]">
          <a-input v-model:value="formState.username" size="large" />
        </a-form-item>
        
        <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Wajib diisi!' }]">
          <a-input-password v-model:value="formState.password" size="large" />
        </a-form-item>

        <a-form-item :label="`Berapa hasil dari: ${captcha.num1} + ${captcha.num2}?`" name="captchaAnswer" :rules="[{ required: true, message: 'Wajib diisi!' }]">
          <a-input type="number" v-model:value="formState.captchaAnswer" size="large" placeholder="Masukkan jawaban angka" />
        </a-form-item>

        <a-button type="primary" html-type="submit" block size="large" :loading="isLoading">Login</a-button>

      </a-form>
    </a-card>
  </div>
</template>