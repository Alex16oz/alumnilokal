const { createClient } = supabase

// URL dan kunci Supabase Anda
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

let allAlumniData = [];
let allHeaders = [];
let currentTableHeaders = [];
let currentSort = { column: null, direction: 'asc' };

// Variabel Paginasi
let currentPage = 1;
let rowsPerPage = 20; // Nilai default

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

  currentTableHeaders = allHeaders; // Secara default pilih semua kolom
  renderTableStructure();
  displayPage(currentPage);
  setupPagination();
  populatePopup(currentTableHeaders);
  populateSortPopup();
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
    label.className = 'container'; // Tambahkan kelas container

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = header;
    checkbox.checked = selectedHeaders.includes(header);
    
    const checkmark = document.createElement('div');
    checkmark.className = 'checkmark';

    label.appendChild(checkbox);
    label.appendChild(checkmark);
    label.appendChild(document.createTextNode(` ${header.replace(/_/g, ' ').toUpperCase()}`));
    columnSelectionContainer.appendChild(label);
  });
}

document.getElementById('toggle-columns-btn').addEventListener('click', () => {
  document.getElementById('popup-container').style.display = 'flex';
  document.body.classList.add('no-scroll');
});

function closePopup() {
  document.getElementById('popup-container').style.display = 'none';
  document.body.classList.remove('no-scroll');
}

function closePaginationPopup() {
    document.getElementById('pagination-popup-container').style.display = 'none';
    document.body.classList.remove('no-scroll');
}

document.getElementById('close-popup-btn').addEventListener('click', closePopup);

document.getElementById('apply-columns-btn').addEventListener('click', () => {
  currentTableHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  renderTableStructure();
  displayPage(1);
  setupPagination();
  populateSortPopup(); // Update sort popup with new columns
  closePopup();
});

document.getElementById('select-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = true);
});

document.getElementById('deselect-all-btn').addEventListener('click', () => {
  document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = false);
});

document.getElementById('toggle-pagination-btn').addEventListener('click', () => {
  document.getElementById('pagination-popup-container').style.display = 'flex';
  document.body.classList.add('no-scroll');
});

document.getElementById('close-pagination-popup-btn').addEventListener('click', closePaginationPopup);

document.getElementById('apply-pagination-btn').addEventListener('click', () => {
  const select = document.getElementById('rows-per-page-select');
  const selectedValue = select.value;
  const paginationControls = document.getElementById('pagination-controls');

  if (selectedValue === 'all') {
    rowsPerPage = allAlumniData.length;
    paginationControls.style.display = 'none';
  } else {
    rowsPerPage = parseInt(selectedValue, 10);
    paginationControls.style.display = 'block';
  }
  
  displayPage(1);
  setupPagination();
  closePaginationPopup();
});

// --- Sort Functionality ---

function populateSortPopup() {
  const sortColumnSelect = document.getElementById('sort-column-select');
  sortColumnSelect.innerHTML = '';
  currentTableHeaders.forEach(header => {
    const option = document.createElement('option');
    option.value = header;
    option.textContent = header.replace(/_/g, ' ').toUpperCase();
    sortColumnSelect.appendChild(option);
  });
}

function sortAlumniData() {
  const { column, direction } = currentSort;
  if (!column) return;

  allAlumniData.sort((a, b) => {
    const valA = a[column];
    const valB = b[column];

    if (valA < valB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function closeSortPopup() {
  document.getElementById('sort-popup-container').style.display = 'none';
  document.body.classList.remove('no-scroll');
}

document.getElementById('toggle-sort-btn').addEventListener('click', () => {
  document.getElementById('sort-popup-container').style.display = 'flex';
  document.body.classList.add('no-scroll');
});

document.getElementById('close-sort-popup-btn').addEventListener('click', closeSortPopup);

document.getElementById('apply-sort-btn').addEventListener('click', () => {
  const column = document.getElementById('sort-column-select').value;
  const direction = document.querySelector('input[name="sort-direction"]:checked').value;
  
  currentSort = { column, direction };
  sortAlumniData();
  displayPage(1);
  closeSortPopup();
});

// --- Dropdown Menu Functionality ---
document.getElementById('menu-dots-btn').addEventListener('click', function() {
  document.getElementById('dropdown-menu').classList.toggle('show');
});

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.menu-dots-button')) {
    var dropdowns = document.getElementsByClassName('dropdown-content');
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

fetchAlumniData();