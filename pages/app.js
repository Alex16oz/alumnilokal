const { createClient } = supabase

// URL dan kunci Supabase Anda
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

let allAlumniData = [];
let allHeaders = [];
let currentTableHeaders = [];

// Variabel Paginasi
let currentPage = 1;
const rowsPerPage = 15; // Anda bisa mengubah jumlah baris per halaman di sini

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

  currentTableHeaders = getSavedHeaders() || allHeaders;
  renderTableStructure();
  displayPage(currentPage);
  setupPagination();
  populatePopup(currentTableHeaders);
}

function renderTableStructure() {
  const alumniContainer = document.getElementById('alumni-container');
  alumniContainer.innerHTML = '';

  if (allAlumniData.length === 0) {
    alumniContainer.innerHTML = '<p>Tidak ada data alumni yang ditemukan.</p>';
    return;
  }

  const table = document.createElement('table');
  table.id = 'alumni-table';
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  tbody.id = 'alumni-tbody';
  const headerRow = document.createElement('tr');

  currentTableHeaders.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText.replace(/_/g, ' ').toUpperCase();
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    th.appendChild(resizer);
    makeResizable(th, resizer);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  table.appendChild(tbody);
  alumniContainer.appendChild(table);
}

function displayPage(page) {
  const tbody = document.getElementById('alumni-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  currentPage = page;

  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedItems = allAlumniData.slice(start, end);

  paginatedItems.forEach(alumnus => {
    const row = document.createElement('tr');
    currentTableHeaders.forEach(header => {
      const cell = document.createElement('td');
      cell.textContent = alumnus[header] || '';
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  updatePaginationInfo();
}

function setupPagination() {
  const totalPages = Math.ceil(allAlumniData.length / rowsPerPage);
  document.getElementById('first-page-btn').addEventListener('click', () => displayPage(1));
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) displayPage(currentPage - 1);
  });
  document.getElementById('next-page-btn').addEventListener('click', () => {
    if (currentPage < totalPages) displayPage(currentPage + 1);
  });
  document.getElementById('last-page-btn').addEventListener('click', () => displayPage(totalPages));
  updatePaginationInfo();
}

function updatePaginationInfo() {
  const totalPages = Math.ceil(allAlumniData.length / rowsPerPage) || 1;
  document.getElementById('page-info').textContent = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('first-page-btn').disabled = currentPage === 1;
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled = currentPage === totalPages;
  document.getElementById('last-page-btn').disabled = currentPage === totalPages;
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
    if (newWidth > 50) {
      th.style.width = `${newWidth}px`;
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
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
  currentTableHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  renderTableStructure();
  displayPage(1);
  setupPagination();
  closePopup();
});

document.getElementById('save-prefs-btn').addEventListener('click', () => {
  const selectedHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  saveHeaders(selectedHeaders);
  alert('Pilihan kolom telah disimpan!');
  currentTableHeaders = selectedHeaders;
  renderTableStructure();
  displayPage(1);
  setupPagination();
  closePopup();
});

document.getElementById('select-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = true);
});

document.getElementById('deselect-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = false);
});

fetchAlumniData();