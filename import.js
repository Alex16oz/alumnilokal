// Konfigurasi Supabase (sama seperti di app.js)
const { createClient } = supabase
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

const fileInput = document.getElementById('file-input');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const previewContainer = document.getElementById('preview-container');
const saveDataBtn = document.getElementById('save-data-btn');

let expectedHeaders = [];
let parsedCsvData = [];

// Mengambil header yang diharapkan dari database saat halaman dimuat
async function getExpectedHeaders() {
    const { data, error } = await _supabase.from('alumni').select('*').limit(1);
    if (error) {
        console.error('Error fetching headers:', error);
        statusMessage.textContent = 'Gagal mengambil format tabel dari database.';
        statusMessage.style.color = 'red';
        return;
    }

    if (data && data.length > 0) {
        expectedHeaders = Object.keys(data[0]).filter(h => h !== 'id');
    } else {
        statusMessage.textContent = 'Tabel di database kosong, validasi header mungkin tidak akurat.';
        statusMessage.style.color = 'orange';
    }
}

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop().toLowerCase();

    reader.onload = function(e) {
        const fileContent = e.target.result;
        switch (fileExtension) {
            case 'csv':
                parseAndValidateCSV(fileContent);
                break;
            case 'json':
                parseAndValidateJSON(fileContent);
                break;
            case 'xlsx':
                parseAndValidateXLSX(fileContent);
                break;
            default:
                statusMessage.textContent = 'Format file tidak didukung. Silakan gunakan CSV, JSON, atau XLSX.';
                statusMessage.style.color = 'red';
                resetState();
        }
    };

    if (fileExtension === 'xlsx') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function processParsedData(data) {
    if (!data || data.length === 0) {
        statusMessage.textContent = 'File tidak mengandung data atau formatnya tidak sesuai.';
        statusMessage.style.color = 'red';
        resetState();
        return;
    }

    const fileHeaders = Object.keys(data[0]);
    
    // Validasi header
    if (expectedHeaders.length > 0) {
        const missingHeaders = expectedHeaders.filter(h => !fileHeaders.includes(h));
        if (missingHeaders.length > 0) {
            statusMessage.textContent = `Validasi Gagal! Header berikut tidak ditemukan: ${missingHeaders.join(', ')}`;
            statusMessage.style.color = 'red';
            resetState();
            return;
        }
    }

    statusMessage.textContent = 'Format file valid. Berikut adalah pratinjau data.';
    statusMessage.style.color = 'green';
    statusContainer.style.display = 'block';

    parsedCsvData = data.map(row => {
        const rowObject = {};
        fileHeaders.forEach(header => {
            if (expectedHeaders.length === 0 || expectedHeaders.includes(header)) {
               rowObject[header] = row[header] !== undefined ? row[header] : null;
            }
        });
        return rowObject;
    }).filter(obj => Object.keys(obj).length > 0);
    
    renderPreview(fileHeaders.filter(h => expectedHeaders.includes(h) || expectedHeaders.length === 0), parsedCsvData);
    saveDataBtn.disabled = false;
}

function parseAndValidateCSV(csvText) {
    const lines = csvText.trim().split(/\r\n|\n/);
    const fileHeaders = lines[0].trim().split(',').map(h => h.replace(/"/g, ''));
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const values = lines[i].trim().split(',');
        const rowObject = {};
        fileHeaders.forEach((header, index) => {
            rowObject[header] = values[index] ? values[index].replace(/"/g, '') : null;
        });
        data.push(rowObject);
    }
    processParsedData(data);
}

function parseAndValidateJSON(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        processParsedData(data);
    } catch (e) {
        statusMessage.textContent = 'Gagal membaca file JSON. Pastikan formatnya benar.';
        statusMessage.style.color = 'red';
        resetState();
    }
}

function parseAndValidateXLSX(arrayBuffer) {
    try {
        const workbook = XLSX.read(arrayBuffer, {type: 'buffer'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        processParsedData(data);
    } catch (e) {
        statusMessage.textContent = 'Gagal membaca file XLSX.';
        statusMessage.style.color = 'red';
        resetState();
    }
}


function renderPreview(headers, data) {
    previewContainer.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const previewData = data.slice(0, 10);
    previewData.forEach(rowData => {
        const row = document.createElement('tr');
        headers.forEach(header => {
            const cell = document.createElement('td');
            cell.textContent = rowData[header] || '';
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    previewContainer.appendChild(table);
}

function resetState() {
    saveDataBtn.disabled = true;
    previewContainer.innerHTML = '';
    parsedCsvData = [];
    statusContainer.style.display = 'none';
}

saveDataBtn.addEventListener('click', async () => {
    if (parsedCsvData.length === 0) {
        alert('Tidak ada data untuk disimpan.');
        return;
    }

    saveDataBtn.disabled = true;
    saveDataBtn.textContent = 'Menyimpan...';

    const { error } = await _supabase.from('alumni').insert(parsedCsvData);

    if (error) {
        console.error('Error saving data:', error);
        alert('Gagal menyimpan data ke database: ' + error.message);
        saveDataBtn.textContent = 'Simpan ke Database';
        saveDataBtn.disabled = false;
    } else {
        alert(`${parsedCsvData.length} baris data berhasil disimpan!`);
        window.location.href = 'index.html'; 
    }
});

getExpectedHeaders();