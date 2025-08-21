// Konfigurasi Supabase (sama seperti di app.js)
const { createClient } = supabase
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
// [KUNCI API YANG DIPERBAIKI]
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

const fileInput = document.getElementById('file-input');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const previewContainer = document.getElementById('preview-container');
const saveDataBtn = document.getElementById('save-data-btn');

// Mendefinisikan struktur tabel alumni berdasarkan skema SQL
const tableSchema = {
    'nik': { type: 'text', required: true },
    'nama_lengkap': { type: 'text', required: true },
    'tanggal_lahir': { type: 'date', required: false },
    'alamat': { type: 'text', required: false },
    'nomor_telepon': { type: 'text', required: false },
    'email': { type: 'text', required: false },
    'pendidikan_terakhir': { type: 'text', required: false },
    'judul_program': { type: 'text', required: true },
    'deskripsi_program': { type: 'text', required: false },
    'tanggal_mulai_program': { type: 'date', required: false },
    'tanggal_selesai_program': { type: 'date', required: false },
    'nama_penyelenggara': { type: 'text', required: false },
    'tanggal_pendaftaran': { type: 'datetime-local', required: false },
    'sudah_bekerja': { type: 'enum', options: ['Belum Bekerja', 'Sudah Bekerja'], required: true },
    'pekerjaan_sesuai': { type: 'enum', options: ['Sesuai', 'Tidak Sesuai'], required: false },
    'tanggal_lulus': { type: 'date', required: false },
};

const expectedHeaders = Object.keys(tableSchema);
let dataToInsert = []; // Data final yang akan disimpan

fileInput.addEventListener('change', handleFileSelect);

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    resetState();
    showStatus('Memproses file...', 'blue');
    
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop().toLowerCase();

    reader.onload = async function(e) {
        const fileContent = e.target.result;
        try {
            let parsedData;
            switch (fileExtension) {
                case 'csv':
                    parsedData = parseCSV(fileContent);
                    break;
                case 'json':
                    parsedData = parseJSON(fileContent);
                    break;
                case 'xlsx':
                    parsedData = parseXLSX(fileContent);
                    break;
                default:
                    throw new Error('Format file tidak didukung.');
            }
            await processData(parsedData);
        } catch (error) {
            showStatus(error.message, 'red');
            saveDataBtn.disabled = true;
        }
    };

    if (fileExtension === 'xlsx') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

// --- FUNGSI PARSING ---
function parseCsvLine(line) {
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (!inQuotes || line[i+1] !== '"')) {
            inQuotes = !inQuotes;
        } else if (char === '"' && inQuotes && line[i+1] === '"') {
            currentVal += '"';
            i++;
        } else if (char === ',' && !inQuotes) {
            values.push(currentVal);
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal);
    return values;
}

function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");
    const fileHeaders = parseCsvLine(lines[0]).map(h => h.trim().replace(/"/g, ''));
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = parseCsvLine(lines[i]);
        if (values.length > fileHeaders.length) {
             values.length = fileHeaders.length;
        }
        const rowObject = {};
        fileHeaders.forEach((header, index) => {
            rowObject[header] = values[index] !== undefined ? values[index] : null;
        });
        data.push(rowObject);
    }
    return data;
}

function parseJSON(jsonText) {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) throw new Error("Format JSON tidak valid.");
    return data;
}

function parseXLSX(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, {type: 'buffer'});
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { raw: false });
}


// --- FUNGSI VALIDASI & PEMROSESAN DATA ---
async function processData(data) {
    if (!data || data.length === 0) {
        throw new Error('File tidak mengandung data.');
    }

    const { validatedData, validationErrors } = validateDataRows(data);
    if (validationErrors.length > 0) {
        throw new Error("Ditemukan kesalahan validasi:\n" + validationErrors.join('\n'));
    }

    showStatus('Memeriksa duplikasi data dengan server...', 'blue');
    const niksInFile = validatedData.map(row => row.nik);
    const { data: existingData, error } = await _supabase.from('alumni').select('nik').in('nik', niksInFile);

    if (error) {
        throw new Error('Gagal memeriksa duplikasi NIK: ' + error.message);
    }
    
    const existingNiks = new Set(existingData.map(row => row.nik));
    dataToInsert = validatedData.filter(row => !existingNiks.has(row.nik));
    const duplicatedData = validatedData.filter(row => existingNiks.has(row.nik));

    renderPreview('Data Baru (Akan Diimpor)', previewContainer, dataToInsert);
    if (duplicatedData.length > 0) {
        const duplicateContainer = document.createElement('div');
        duplicateContainer.id = 'duplicate-preview';
        statusContainer.appendChild(duplicateContainer);
        renderPreview('Data Duplikat (Akan Dilewati)', duplicateContainer, duplicatedData);
    }

    let finalMessage = `Validasi selesai. Ditemukan ${dataToInsert.length} data baru.`;
    if (duplicatedData.length > 0) {
        finalMessage += ` ${duplicatedData.length} data duplikat dilewati.`;
    }
    showStatus(finalMessage, 'green');

    if (dataToInsert.length > 0) {
        saveDataBtn.disabled = false;
    } else {
        showStatus('Tidak ada data baru untuk diimpor.', 'orange');
        saveDataBtn.disabled = true;
    }
}

function validateDataRows(data) {
    const validationErrors = [];
    const validatedData = data.map((row, rowIndex) => {
        const transformedRow = {};
        let hasErrorInRow = false;
        for (const header of expectedHeaders) {
            const value = row[header];
            const schema = tableSchema[header];
            if (schema.required && (value === null || value === undefined || value === '')) {
                validationErrors.push(`Baris ${rowIndex + 2}: Kolom '${header}' wajib diisi.`);
                hasErrorInRow = true;
            } else if (value !== null && value !== undefined && value !== '') {
                 try {
                    transformedRow[header] = transformAndValidate(value, schema.type, schema.options);
                 } catch (e) {
                    validationErrors.push(`Baris ${rowIndex + 2}, Kolom '${header}': ${e.message}`);
                    hasErrorInRow = true;
                 }
            } else {
                 transformedRow[header] = null;
            }
        }
        return hasErrorInRow ? null : transformedRow;
    }).filter(row => row !== null);
    
    return { validatedData, validationErrors };
}


function transformAndValidate(value, type, options) {
    switch (type) {
        case 'date':
        case 'datetime-local':
            const date = new Date(value);
            if (isNaN(date.getTime())) throw new Error(`Format tanggal tidak valid.`);
            return date.toISOString();
        case 'enum':
            if (!options.includes(value)) throw new Error(`Nilai tidak valid. Pilihan: ${options.join('/')}.`);
            return value;
        default:
            return String(value);
    }
}


// --- FUNGSI TAMPILAN & UI ---
function renderPreview(title, container, data) {
    container.innerHTML = '';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.marginTop = '20px';
    container.appendChild(titleElement);
    
    if (data.length === 0) {
        container.innerHTML += '<p>Tidak ada data untuk ditampilkan.</p>';
        return;
    }

    const tableContainer = document.createElement('div');
    tableContainer.style.maxHeight = '40vh';
    tableContainer.style.overflow = 'auto';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    
    expectedHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const previewData = data.slice(0, 100);
    previewData.forEach(rowData => {
        const row = document.createElement('tr');
        expectedHeaders.forEach(header => {
            const cell = document.createElement('td');
            let cellValue = rowData[header] || '';
            if (tableSchema[header].type.includes('date') && cellValue) {
                cellValue = new Date(cellValue).toLocaleDateString('id-ID');
            }
            cell.textContent = cellValue;
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
}

function showStatus(message, color) {
    statusMessage.textContent = message;
    statusMessage.style.color = color;
    statusContainer.style.display = 'block';
}

function resetState() {
    saveDataBtn.disabled = true;
    saveDataBtn.textContent = 'Simpan ke Database';
    previewContainer.innerHTML = '';
    
    const duplicateContainer = document.getElementById('duplicate-preview');
    if (duplicateContainer) {
        duplicateContainer.remove();
    }

    dataToInsert = [];
    statusContainer.style.display = 'none';
    statusMessage.textContent = '';
}

// --- EVENT LISTENER TOMBOL SIMPAN ---
saveDataBtn.addEventListener('click', async () => {
    if (dataToInsert.length === 0) {
        alert('Tidak ada data baru untuk disimpan.');
        return;
    }

    saveDataBtn.disabled = true;
    saveDataBtn.textContent = 'Menyimpan...';

    const { error } = await _supabase.from('alumni').insert(dataToInsert);

    if (error) {
        alert('Gagal menyimpan data ke database: ' + error.message);
        saveDataBtn.textContent = 'Simpan ke Database';
        saveDataBtn.disabled = false;
    } else {
        alert(`${dataToInsert.length} baris data baru berhasil disimpan!`);
        window.location.href = 'index.html'; 
    }
});