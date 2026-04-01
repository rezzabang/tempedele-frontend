<script setup>
import { ref, reactive, computed } from 'vue';
import axios from 'axios';
import { message } from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';

const isLoading = ref(false);
const isSaving = ref(false);
const visitList = ref([]);

const formState = reactive({
  noRm: '',
  namaPasien: '',
  registrasiId: null,
  jenisKunjungan: '',
  diagnosa: '',
  sctid: '-' 
});

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

const visitOptions = computed(() => {
  if (!visitList.value.length) return [];
  
  // Gunakan slice() sebelum reverse agar tidak merusak array asli (walau spread sudah melakukannya)
  return [...visitList.value].reverse().map(visit => {
    // Ambil hanya 10 karakter pertama (YYYY-MM-DD) sebelum replace
    const rawDate = visit.TanggalMasuk ? visit.TanggalMasuk.substring(0, 10) : '';
    const formattedDate = rawDate.replace(/-/g, '/');
    
    return { 
      value: visit.RegistrasiId, 
      label: formattedDate || 'Tanpa Tanggal', 
      ruangan: visit.RuangDeskripsi || 'Tanpa Ruangan' 
    };
  });
});

// 1. Tarik Data Pasien (Cukup kirimkan X-External-Token)
const fetchPatientData = async () => {
  if (!formState.noRm) {
    message.warning('Masukkan No Rekam Medis terlebih dahulu!');
    return;
  }

  isLoading.value = true;
  visitList.value = []; 
  formState.namaPasien = '';
  formState.registrasiId = null;
  formState.jenisKunjungan = '';
  formState.diagnosa = '';
  formState.sctid = '-';

  Object.keys(fileList).forEach(key => fileList[key] = []);

  try {
    // PANGGILAN API JADI SANGAT SEDERHANA
    // Tidak perlu header X-External-Token lagi
    const response = await axios.get(`/pasien/${formState.noRm}`);

    if (response.data.statusCode === 200 && response.data.result.length > 0) {
      visitList.value = response.data.result;
      formState.namaPasien = visitList.value[0].Nama;
      message.success(`Ditemukan ${visitList.value.length} riwayat kunjungan.`);
    } else {
      message.error('Data pasien tidak ditemukan.');
    }
  } catch (error) {
    console.error(error);
    message.error('Gagal mengambil data dari server Backend.');
  } finally {
    isLoading.value = false;
  }
};

const handleVisitChange = (selectedRegistrasiId) => {
  const selectedData = visitList.value.find(visit => visit.RegistrasiId === selectedRegistrasiId);
  if (selectedData) {
    formState.jenisKunjungan = selectedData.JenisLayanan;
    formState.diagnosa = selectedData.DeskripsiDiagnosis;
    formState.sctid = '-'; 
  }
};

// 3. SNOMED (Tidak perlu lagi memasukkan token manual)
const handleDiagnosaSearch = (searchText) => {
  formState.sctid = '-'; 
  clearTimeout(snomedSearchTimeout);

  if (!searchText) {
    snomedOptions.value = [];
    return;
  }

  snomedSearchTimeout = setTimeout(async () => {
    try {
      // URL sangat pendek karena baseURL sudah diatur
      const response = await axios.get(`/snomed/${searchText}`);

      if (response.data && response.data.items && response.data.items.length > 0) {
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

// 5. Simpan Data ke Laravel (Header Auth otomatis masuk)
const saveToLaravel = async () => {
  if (!formState.registrasiId) {
    message.warning('Silakan pilih Tanggal Kunjungan terlebih dahulu!');
    return;
  }

  isSaving.value = true;

  try {
    const originalData = visitList.value.find(visit => visit.RegistrasiId === formState.registrasiId);
    const formData = new FormData();
    
    formData.append('nocm', originalData.NoRm);
    formData.append('nama', originalData.Nama);
    formData.append('pelayanan', formState.jenisKunjungan);
    formData.append('diagnosa', formState.diagnosa);
    formData.append('sctid', formState.sctid); 
    
    const formattedDate = originalData.TanggalMasuk.replace(/-/g, '/');
    formData.append('kunjungan', formattedDate); 

    Object.keys(fileList).forEach(docType => {
      if (fileList[docType] && fileList[docType].length > 0) {
        fileList[docType].forEach(fileItem => {
          if (fileItem.originFileObj) {
            formData.append('images[]', fileItem.originFileObj); 
          }
        });
      }
    });

    // Panggil endpoint '/post'. Header Auth diurus otomatis oleh main.js
    const response = await axios.post(`/post`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (response.status === 200 || response.status === 201) {
      message.success('Data & Dokumen berhasil disimpan ke database!');
      
      formState.noRm = '';
      formState.namaPasien = '';
      formState.registrasiId = null;
      formState.jenisKunjungan = '';
      formState.diagnosa = '';
      formState.sctid = '-';
      
      visitList.value = [];
      Object.keys(fileList).forEach(key => fileList[key] = []);
    }
  } catch (error) {
    console.error("Error lengkap:", error);
    if (error.response && error.response.status === 422) {
      const validationErrors = error.response.data.errors;
      const firstErrorKey = Object.keys(validationErrors)[0];
      message.error(`Validasi gagal: ${validationErrors[firstErrorKey][0]}`);
    } else {
      message.error('Gagal menyimpan data ke Laravel. Cek koneksi Anda.');
    }
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="form-container">
    <a-card 
      title="Tambah Rekam Medis Inaktif" 
      :headStyle="{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }" 
      bordered 
      hoverable
    >
      
      <a-form layout="vertical" :model="formState">
        
        <a-form-item label="No Rekam Medis:">
          <a-input-search
            v-model:value="formState.noRm"
            placeholder="Contoh: 00000000"
            enter-button="Cari"
            size="large"
            :loading="isLoading"
            @search="fetchPatientData"
          />
        </a-form-item>

        <a-form-item label="Nama Pasien:">
          <a-input v-model:value="formState.namaPasien" size="large" readonly />
        </a-form-item>

        <a-form-item label="Tanggal Kunjungan:">
          <a-select
            v-model:value="formState.registrasiId"
            size="large"
            placeholder="-- Pilih Tanggal Kunjungan --"
            :options="visitOptions"
            :disabled="visitList.length === 0"
            :virtual="false"
            @change="handleVisitChange"
          >
            <template #option="{ value, label, ruangan }">
              <div :key="value">
                <span style="font-weight: bold;">{{ label }}</span> - {{ ruangan }}
              </div>
            </template>
          </a-select>
        </a-form-item>

        <a-form-item label="Jenis Perawatan:">
          <a-select
            v-model:value="formState.jenisKunjungan"
            size="large"
            placeholder="Pilih Jenis Perawatan"
            :options="jenisKunjunganOptions"
          />
        </a-form-item>

        <a-form-item label="Diagnosa:">
          <a-auto-complete
            v-model:value="formState.diagnosa"
            :options="snomedOptions"
            size="large"
            placeholder="Ketik untuk mencari diagnosa..."
            @search="handleDiagnosaSearch"
            @select="handleDiagnosaSelect"
          >
            <template #option="{ label }">
              {{ label }}
            </template>
          </a-auto-complete>
        </a-form-item>

        <div v-if="formState.registrasiId">
          <a-divider>Upload Dokumen</a-divider>

          <div v-if="formState.jenisKunjungan === 'Rawat Jalan'">
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

          <div v-if="formState.jenisKunjungan === 'Gawat Darurat'">
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

          <div v-if="formState.jenisKunjungan === 'Rawat Inap'">
            <a-form-item label="RM Rawat Jalan:">
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
        </div>

      </a-form>

      <a-button 
        type="primary" block size="large" style="margin-top: 10px;"
        :disabled="!formState.registrasiId" :loading="isSaving" @click="saveToLaravel"
      >
        Simpan Data
      </a-button>

      <a-button 
        block size="large" style="margin-top: 10px;"
        @click="$router.back()"
      >
        Batal
      </a-button>

    </a-card>
  </div>
</template>

<style scoped>
.form-container { max-width: 600px; margin: 10px auto; padding: 0 20px; }
:deep(.ant-form-item-label > label) { font-size: 14px; color: #333; font-weight: 500; }
</style>