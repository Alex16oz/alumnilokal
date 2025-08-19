const { createClient } = supabase

// URL dan kunci Supabase Anda
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

let allAlumniData = [];
let allHeaders = [];

async function fetchAlumniData() {
  const { data, error } = await _supabase.from('alumni').select('*');
  if (error) {
    console.error('Error fetching alumni:', error);
    return;
  }
  allAlumniData = data;
  if (data.length > 0) {
    allHeaders = Object.keys(data[0]);
  }

  // Muat preferensi kolom atau gunakan semua kolom jika tidak ada
  const savedHeaders = getSavedHeaders() || allHeaders;
  renderTable(savedHeaders);
  populatePopup(savedHeaders);
}

function renderTable(headersToShow) {
  const alumniContainer = document.getElementById('alumni-container');
  alumniContainer.innerHTML = '';

  if (allAlumniData.length === 0) {
    alumniContainer.innerHTML = '<p>Tidak ada data alumni yang ditemukan.</p>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const headerRow = document.createElement('tr');

  headersToShow.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText.replace(/_/g, ' ').toUpperCase();

    // Tambahkan elemen untuk mengubah ukuran
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    th.appendChild(resizer);
    makeResizable(th, resizer);

    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  allAlumniData.forEach(alumnus => {
    const row = document.createElement('tr');
    headersToShow.forEach(header => {
      const cell = document.createElement('td');
      cell.textContent = alumnus[header] || ''; // Beri nilai default jika null
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  alumniContainer.appendChild(table);

  // autoSizeColumns(table); // Fungsi ini dinonaktifkan untuk mengizinkan CSS menangani lebar kolom
}

function makeResizable(th, resizer) {
  let startX, startWidth;

  resizer.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startWidth = th.offsetWidth;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    const newWidth = startWidth + (e.clientX - startX);
    if (newWidth > 50) { // Lebar minimum kolom
        th.style.width = `${newWidth}px`;
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

// Fungsi autoSizeColumns tidak lagi dipanggil, namun tetap ada jika diperlukan di masa depan
function autoSizeColumns(table) {
  const headers = Array.from(table.querySelectorAll('thead th'));
  const rows = Array.from(table.querySelectorAll('tbody tr'));

  headers.forEach((header, index) => {
    let maxWidth = header.offsetWidth;
    rows.forEach(row => {
      const cell = row.cells[index];
      const cellWidth = cell.scrollWidth;
      if (cellWidth > maxWidth) {
        maxWidth = cellWidth;
      }
    });
    header.style.width = `${maxWidth + 20}px`;
  });
}

function populatePopup(selectedHeaders) {
  const columnSelectionContainer = document.getElementById('column-selection');
  columnSelectionContainer.innerHTML = '';
  allHeaders.forEach(header => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = header;
    checkbox.checked = selectedHeaders.includes(header);
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${header.replace(/_/g, ' ').toUpperCase()}`));
    columnSelectionContainer.appendChild(label);
  });
}

function saveHeaders(headers) {
  localStorage.setItem('alumniTableHeaders', JSON.stringify(headers));
}

function getSavedHeaders() {
  const saved = localStorage.getItem('alumniTableHeaders');
  return saved ? JSON.parse(saved) : null;
}

document.getElementById('toggle-columns-btn').addEventListener('click', () => {
  document.getElementById('popup-container').style.display = 'flex';
  document.body.classList.add('no-scroll');
});

function closePopup() {
  document.getElementById('popup-container').style.display = 'none';
  document.body.classList.remove('no-scroll');
}

document.getElementById('close-popup-btn').addEventListener('click', closePopup);

document.getElementById('apply-columns-btn').addEventListener('click', () => {
  const selectedHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  renderTable(selectedHeaders);
  closePopup();
});

document.getElementById('save-prefs-btn').addEventListener('click', () => {
  const selectedHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  saveHeaders(selectedHeaders);
  alert('Pilihan kolom telah disimpan!');
  renderTable(selectedHeaders);
  closePopup();
});

document.getElementById('select-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = true);
});

document.getElementById('deselect-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = false);
});

fetchAlumniData();