<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { message, Modal } from 'ant-design-vue'; // Tambahkan Modal di sini
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons-vue';

const route = useRoute();
const router = useRouter();
const idRiwayat = route.params.id; // Ambil ID dari URL

const isLoadingData = ref(true);
const isSaving = ref(false);

// State Form Teks
const formState = reactive({
  nocm: '',
  nama: '',
  pelayanan: '',
  kunjungan: '',
  diagnosa: '',
  petugas: '', 
  sctid: '-'
});

// Menyimpan daftar gambar dari database
const existingImages = ref([]); 

// State File Upload (Untuk menambahkan dokumen baru)
const fileList = reactive({
  rm01: [], rm02: [], rm13: [], rm14: [], sp26: [], 
  visum: [], suketMen: [], lapOp: [], skl: []
});

const jenisKunjunganOptions = ref([
  { value: 'Rawat Inap', label: 'Rawat Inap' },
  { value: 'Rawat Jalan', label: 'Rawat Jalan' },
  { value: 'Gawat Darurat', label: 'Gawat Darurat (IGD)' }
]);

const snomedOptions = ref([]);
let snomedSearchTimeout = null;

// ================= FUNGSI-FUNGSI =================

// 1. Ambil data saat halaman dimuat
const fetchRiwayatDetail = async () => {
  isLoadingData.value = true;
  try {
    // Cukup panggil '/post/{id}' karena Base URL dan Token sudah diatur otomatis di main.js
    const response = await axios.get(`/post/${idRiwayat}`);
    const data = response.data.data;

    // Isi form dengan data dari database
    formState.nocm = data.nocm; 
    formState.nama = data.nama;
    formState.pelayanan = data.pelayanan;
    formState.kunjungan = data.kunjungan;
    formState.diagnosa = data.diagnosa;
    formState.petugas = data.user;
    formState.sctid = (data.sctid === 'null' || !data.sctid) ? '-' : data.sctid;
    
// Proses Array Gambar
if (data.images && data.images.length > 0) {
  // Ambil dari window.APP_CONFIG, jika tidak ada fallback ke string kosong
  let backendUrl = window.APP_CONFIG?.API_URL || "";
  
  if (backendUrl) {
    // Hapus slash di akhir dan hapus /api agar dapat base URL-nya
    backendUrl = backendUrl.replace(/\/$/, '').replace('/api', ''); 
    
    existingImages.value = data.images.map(img => ({
      id: img.id,
      url: `${backendUrl}/storage/post-img/${img.image}`
    }));
  }
} else {
  existingImages.value = [];
}

  } catch (error) {
    message.error('Gagal mengambil detail dokumen.');
    console.error(error);
  } finally {
    isLoadingData.value = false;
  }
};

onMounted(() => {
  fetchRiwayatDetail();
});

// 2. Fungsi Pencarian SNOMED
const handleDiagnosaSearch = (searchText) => {
  formState.sctid = '-'; 
  clearTimeout(snomedSearchTimeout);

  if (!searchText) {
    snomedOptions.value = [];
    return;
  }

  snomedSearchTimeout = setTimeout(async () => {
    try {
      const response = await axios.get(`/snomed/${searchText}`);

      if (response.data && response.data.items) {
        snomedOptions.value = response.data.items.map(item => ({
          value: item.fsn_term,
          label: item.fsn_term,
          sctid: item.sctid
        }));
      } else {
        snomedOptions.value = [];
      }
    } catch (error) {
      console.error('Error fetching SNOMED:', error);
    }
  }, 500);
};

const handleDiagnosaSelect = (value, option) => {
  formState.diagnosa = value;
  formState.sctid = option.sctid;
};

// 3. Simpan Pembaruan (Update) ke Laravel
const handleUpdate = async () => {
  isSaving.value = true;
  try {
    const formData = new FormData();
    
    formData.append('nocm', formState.nocm);
    formData.append('nama', formState.nama);
    formData.append('pelayanan', formState.pelayanan);
    formData.append('diagnosa', formState.diagnosa);
    formData.append('sctid', formState.sctid);
    formData.append('kunjungan', formState.kunjungan);

    // Kirim gambar BARU jika ada yang ditambahkan
    Object.keys(fileList).forEach(docType => {
      if (fileList[docType] && fileList[docType].length > 0) {
        fileList[docType].forEach(fileItem => {
          if (fileItem.originFileObj) {
            formData.append('images[]', fileItem.originFileObj); 
          }
        });
      }
    });

    // Karena API Anda menggunakan rute Route::post('/post/{id}') untuk update, kita pakai POST langsung
    const response = await axios.post(`/post/${idRiwayat}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' } // Token sudah otomatis
    });
    
    if (response.status === 200 || response.status === 201) {
      message.success('Dokumen berhasil diperbarui!');
      router.push('/lihat-riwayat'); 
    }
  } catch (error) {
    console.error("Error lengkap:", error);
    if (error.response && error.response.status === 422) {
      const validationErrors = error.response.data.errors;
      const firstErrorKey = Object.keys(validationErrors)[0];
      message.error(`Validasi gagal: ${validationErrors[firstErrorKey][0]}`);
    } else {
      message.error('Gagal memperbarui data.');
    }
  } finally {
    isSaving.value = false;
  }
};

// 4. Fungsi Hapus Gambar Satuan
const deleteExistingImage = (imageId) => {
  Modal.confirm({
    title: 'Hapus Gambar?',
    content: 'Gambar akan dihapus secara permanen di sistem. Apakah anda yakin?',
    okText: 'Ya, Hapus',
    okType: 'danger',
    cancelText: 'Batal',
    onOk: async () => {
      try {
        // Tembak API delete image Laravel
        await axios.delete(`/image/${imageId}`);
        
        // Hapus gambar dari tampilan UI secara instan (tanpa perlu refresh)
        existingImages.value = existingImages.value.filter(img => img.id !== imageId);
        
        message.success('Gambar berhasil dihapus secara permanen!');
      } catch (error) {
        console.error(error);
        message.error('Gagal menghapus gambar. Silakan coba lagi.');
      }
    }
  });
};
</script>

<template>
  <div style="display: flex; justify-content: center;">
    <a-card 
      bordered 
      style="border-radius: 8px; width: 100%; max-width: 600px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"
      :loading="isLoadingData"
    >
      <h2 style="text-align: center; margin-bottom: 20px; font-weight: 600;">Edit Dokumen Terupload</h2>
      
<div v-if="existingImages.length > 0" style="text-align: center; margin-bottom: 30px;">
        <a-image-preview-group>
          <a-space wrap style="justify-content: center;">
            
            <div 
              v-for="img in existingImages" 
              :key="img.id" 
              style="position: relative; display: inline-block; margin: 0 5px;"
            >
              <a-image
                :width="120"
                :height="150"
                :src="img.url"
                style="border-radius: 6px; object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
              />
              
              <a-button 
                danger 
                shape="circle" 
                size="small" 
                style="position: absolute; top: -8px; right: -8px; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"
                @click="deleteExistingImage(img.id)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>

          </a-space>
        </a-image-preview-group>
        <div style="font-size: 12px; color: gray; margin-top: 15px;">Klik gambar untuk memperbesar & melihat gallery</div>
      </div>
      <div v-else style="text-align: center; margin-bottom: 30px; color: gray; font-style: italic;">
        Tidak ada dokumen yang terlampir sebelumnya.
      </div>

      <a-form layout="vertical" :model="formState">
        
        <a-form-item label="No Rekam Medis:">
          <a-input v-model:value="formState.nocm" size="large" readonly />
        </a-form-item>

        <a-form-item label="Nama Pasien:">
          <a-input v-model:value="formState.nama" size="large" />
        </a-form-item>

        <a-form-item label="Jenis Pelayanan:">
          <a-select
            v-model:value="formState.pelayanan"
            size="large"
            :options="jenisKunjunganOptions"
          />
        </a-form-item>

        <a-form-item label="Tanggal Kunjungan:">
          <a-input v-model:value="formState.kunjungan" size="large" />
        </a-form-item>

        <a-form-item label="Diagnosa:">
          <a-auto-complete
            v-model:value="formState.diagnosa"
            :options="snomedOptions"
            size="large"
            placeholder="Ketik untuk mencari diagnosa SNOMED..."
            @search="handleDiagnosaSearch"
            @select="handleDiagnosaSelect"
          >
            <template #option="{ label }">{{ label }}</template>
          </a-auto-complete>
        </a-form-item>

        <a-form-item label="Petugas:">
          <a-input v-model:value="formState.petugas" size="large" readonly />
        </a-form-item>

<div style="text-align: center; margin-top: 30px; margin-bottom: 15px;">
          <h3 style="font-weight: 600;">Tambah Dokumen Baru</h3>
          <p style="font-size: 12px; color: gray; margin-top: -10px;">(Abaikan jika tidak ingin menambah dokumen)</p>
        </div>

        <div v-if="formState.pelayanan === 'Rawat Jalan'">
          <a-form-item label="RM-02 (Rawat Jalan):">
            <a-upload v-model:file-list="fileList.rm02" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar RM-02</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Informed Consent:">
            <a-upload v-model:file-list="fileList.sp26" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Consent</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Lembar Visum:">
            <a-upload v-model:file-list="fileList.visum" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Visum</a-button>
            </a-upload>
          </a-form-item>
        </div>

        <div v-if="formState.pelayanan === 'IGD' || formState.pelayanan === 'Gawat Darurat'">
          <a-form-item label="RM-01:">
            <a-upload v-model:file-list="fileList.rm01" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar RM-01</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Informed Consent:">
            <a-upload v-model:file-list="fileList.sp26" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Consent</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Lembar Kematian:">
            <a-upload v-model:file-list="fileList.suketMen" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Kematian</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Laporan Operasi:">
            <a-upload v-model:file-list="fileList.lapOp" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Laporan OP</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Surat Kelahiran:">
            <a-upload v-model:file-list="fileList.skl" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar SKL</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Lembar Visum:">
            <a-upload v-model:file-list="fileList.visum" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Visum</a-button>
            </a-upload>
          </a-form-item>
        </div>

        <div v-if="formState.pelayanan === 'Rawat Inap'">
          <a-form-item label="RM Rawat Jalan (RM-02):">
            <a-upload v-model:file-list="fileList.rm02" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar RM-02</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Informed Consent:">
            <a-upload v-model:file-list="fileList.sp26" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Consent</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="RM-14:">
            <a-upload v-model:file-list="fileList.rm14" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar RM-14</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="RM-13:">
            <a-upload v-model:file-list="fileList.rm13" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar RM-13</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Lembar Kematian:">
            <a-upload v-model:file-list="fileList.suketMen" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Kematian</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Laporan Operasi:">
            <a-upload v-model:file-list="fileList.lapOp" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Laporan OP</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Surat Keterangan Lahir:">
            <a-upload v-model:file-list="fileList.skl" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar SKL</a-button>
            </a-upload>
          </a-form-item>
          <a-form-item label="Lembar Visum:">
            <a-upload v-model:file-list="fileList.visum" multiple :before-upload="() => false">
              <a-button><upload-outlined /> Pilih Gambar Visum</a-button>
            </a-upload>
          </a-form-item>
        </div>

        <div style="margin-top: 40px;">
          <a-button 
            type="primary" 
            block
            size="large" 
            style="background-color: #198754; border-color: #198754; margin-bottom: 10px;"
            :loading="isSaving"
            @click="handleUpdate"
          >
            Update Data & Dokumen
          </a-button>
          
          <a-button 
            block
            size="large" 
            @click="$router.back()"
          >
            Batal
          </a-button>
        </div>

      </a-form>
    </a-card>
  </div>
</template>