<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import axios from 'axios';

const router = useRouter();
const route = useRoute();
const dataRiwayat = ref([]);
const isLoading = ref(false);

const searchQuery = ref('');
const currentUser = localStorage.getItem('user_name_login');

// 1. Konfigurasi Pagination (Halaman) untuk Tabel
const pagination = ref({
  current: 1,
  pageSize: 10, // Sama dengan paginate(10) di Laravel
  total: 0,
  showSizeChanger: false,
});

const columns = [
  { title: 'No. RM', dataIndex: 'nocm', key: 'nocm' },
  { title: 'Nama Pasien', dataIndex: 'nama', key: 'nama' },
  { title: 'Tanggal Kunjungan', dataIndex: 'kunjungan', key: 'kunjungan' },
  { title: 'Jenis Pelayanan', dataIndex: 'pelayanan', key: 'pelayanan' },
  { title: 'User', dataIndex: 'user', key: 'user' },
  { title: 'Update', key: 'update', align: 'center' },
  { title: 'Delete', key: 'delete', align: 'center' },
];

// 2. Fungsi Tarik Data menggunakan Endpoint Search Anda
const fetchRiwayat = async (page = 1) => {
  isLoading.value = true;
  try {
    const response = await axios.get('/posts/search', {
      params: {
        search: searchQuery.value, // Mengirim parameter ?search=keyword
        page: page                 // Mengirim parameter ?page=1
      }
    });
    
    // Karena menggunakan paginate(), array datanya ada di dalam response.data.data.data
    const responseData = response.data.data;
    dataRiwayat.value = responseData.data;

    // Update status angka Pagination di bawah tabel
    pagination.value.total = responseData.total;
    pagination.value.current = responseData.current_page;

  } catch (error) {
    message.error('Gagal memuat data riwayat');
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

const onSearch = () => {
  // Setiap kali mencari kata kunci baru, mulai dari halaman 1
  fetchRiwayat(1);
};

// 3. Fungsi saat user mengklik angka halaman (Pindah Page) di bawah tabel
const handleTableChange = (pag) => {
  fetchRiwayat(pag.current);
};

onMounted(() => {
  // Jika dialihkan dari Dashboard, otomatis isi kotak search
  if (route.query.search) {
    searchQuery.value = route.query.search;
  }
  fetchRiwayat();
});

const editRecord = (id) => {
  router.push(`/edit-riwayat/${id}`);
};

const deleteRecord = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data ini secara permanen?')) {
    try {
      await axios.delete(`/post/${id}`);
      message.success('Data berhasil dihapus');
      fetchRiwayat(pagination.value.current); // Refresh data di halaman saat ini
    } catch (error) {
      message.error('Gagal menghapus data');
    }
  }
};
</script>

<template>
  <a-card bordered style="border-radius: 8px;">
    <h2 style="text-align: center; margin-bottom: 20px;">Pencarian Dokumen</h2>
    
    <a-input-search
      v-model:value="searchQuery"
      placeholder="Ketik No RM, Nama Pasien, atau Nama Petugas..."
      enter-button="Cari"
      size="large"
      style="margin-bottom: 30px;"
      @search="onSearch"
    />

    <h3>Daftar dokumen yang sudah di scan</h3>
    
    <a-table 
      :columns="columns" 
      :data-source="dataRiwayat" 
      :loading="isLoading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'nocm'">
          <a style="font-weight: bold;">{{ record.nocm }}</a>
        </template>

        <template v-else-if="column.key === 'update'">
          <a-button type="primary" ghost shape="round" @click="editRecord(record.id)">Edit</a-button>
        </template>

        <template v-else-if="column.key === 'delete'">
          <a-button 
            danger 
            shape="round" 
            v-if="record.user === currentUser || currentUser === 'Admin'"
            @click="deleteRecord(record.id)"
          >
            Delete
          </a-button>
          <span v-else style="color: #ccc; font-size: 12px;">Tidak ada akses</span>
        </template>
      </template>
    </a-table>
  </a-card>
</template>