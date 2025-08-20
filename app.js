const { createClient } = supabase

// URL dan kunci Supabase Anda
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

// --- Variabel Konfigurasi ---
const primaryKeyColumn = 'email'; 

let allAlumniData = [];
let filteredAlumniData = [];
let allHeaders = [];
let columnTypes = {}; 
let currentTableHeaders = [];
let currentSort = { column: null, direction: 'asc' };
let currentFilters = [];
let selectedAlumnusId = null;

// Variabel Paginasi
let currentPage = 1;
let rowsPerPage = 20; 

// --- FUNGSI UTAMA ---

async function fetchAlumniData() {
  const { data, error } = await _supabase.from('alumni').select('*');
  if (error) {
    console.error('Error fetching alumni:', error);
    return;
  }
  allAlumniData = data;
  if (data.length > 0) {
    allHeaders = Object.keys(data[0]);
    inferAndStoreColumnTypes(); 
  }

  currentTableHeaders = allHeaders; 
  applyFiltersAndSort();
  renderTableStructure();
  displayPage(currentPage);
  setupPagination();
  populateColumnSelectionPopup(currentTableHeaders);
  populateSortPopup();
  renderFilterPopup();
}

// --- FUNGSI RENDER & TAMPILAN ---

function renderTableStructure() {
  const alumniContainer = document.getElementById('alumni-container');
  alumniContainer.innerHTML = '';

  if (filteredAlumniData.length === 0) {
    alumniContainer.innerHTML = '<p>Tidak ada data alumni yang cocok dengan filter Anda.</p>';
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
    const paginatedItems = filteredAlumniData.slice(start, end);

    paginatedItems.forEach(alumnus => {
        const row = document.createElement('tr');
        row.dataset.id = alumnus[primaryKeyColumn]; // Simpan ID di data attribute

        currentTableHeaders.forEach(header => {
            const cell = document.createElement('td');
            cell.textContent = alumnus[header] || '';
            row.appendChild(cell);
        });

        // Tambahkan event listener untuk pemilihan baris
        row.addEventListener('click', () => {
            handleRowSelection(alumnus[primaryKeyColumn]);
        });

        tbody.appendChild(row);
    });

    // Reset pemilihan jika halaman berubah
    deselectRow(); 
    updatePaginationInfo();
}


function handleRowSelection(id) {
    const editBtn = document.getElementById('edit-data-btn');
    const deleteBtn = document.getElementById('delete-data-btn');

    // Deselect jika ID yang sama diklik lagi
    if (selectedAlumnusId === id) {
        deselectRow();
        return;
    }

    // Hapus highlight dari baris sebelumnya
    if (selectedAlumnusId) {
        const previousSelectedRow = document.querySelector(`tr[data-id="${selectedAlumnusId}"]`);
        if (previousSelectedRow) {
            previousSelectedRow.classList.remove('selected');
        }
    }

    // Highlight baris baru dan simpan ID-nya
    selectedAlumnusId = id;
    const newSelectedRow = document.querySelector(`tr[data-id="${id}"]`);
    if (newSelectedRow) {
        newSelectedRow.classList.add('selected');
    }

    // Tampilkan tombol Edit dan Hapus
    editBtn.style.display = 'inline-block';
    deleteBtn.style.display = 'inline-block';
}

function deselectRow() {
    const editBtn = document.getElementById('edit-data-btn');
    const deleteBtn = document.getElementById('delete-data-btn');

    if (selectedAlumnusId) {
        const selectedRow = document.querySelector(`tr[data-id="${selectedAlumnusId}"]`);
        if (selectedRow) {
            selectedRow.classList.remove('selected');
        }
    }
    selectedAlumnusId = null;

    // Sembunyikan tombol Edit dan Hapus
    editBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
}


// --- FUNGSI PAGINASI ---

function setupPagination() {
  document.getElementById('first-page-btn').onclick = () => displayPage(1);
  document.getElementById('prev-page-btn').onclick = () => { if (currentPage > 1) displayPage(currentPage - 1); };
  document.getElementById('next-page-btn').onclick = () => { if (currentPage < Math.ceil(filteredAlumniData.length / rowsPerPage)) displayPage(currentPage + 1); };
  document.getElementById('last-page-btn').onclick = () => displayPage(Math.ceil(filteredAlumniData.length / rowsPerPage));
  updatePaginationInfo();
}

function updatePaginationInfo() {
  const totalPages = Math.ceil(filteredAlumniData.length / rowsPerPage) || 1;
  document.getElementById('page-info').textContent = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('first-page-btn').disabled = currentPage === 1;
  document.getElementById('prev-page-btn').disabled = currentPage === 1;
  document.getElementById('next-page-btn').disabled = currentPage === totalPages;
  document.getElementById('last-page-btn').disabled = currentPage === totalPages;
}


// --- FUNGSI UTILITAS TABEL ---

function makeResizable(th, resizer) {
  let startX, startWidth;
  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
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

function inferAndStoreColumnTypes() {
    if (allAlumniData.length === 0) return;

    const enumColumns = {
        'sudah_bekerja': ['Belum Bekerja', 'Sudah Bekerja'],
        'pekerjaan_sesuai': ['Sesuai', 'Tidak Sesuai']
    };

    const firstRow = allAlumniData[0];
    allHeaders.forEach(header => {
        if (enumColumns[header]) {
            columnTypes[header] = { type: 'enum', options: enumColumns[header] };
            return;
        }

        const value = firstRow[header];
        if (value === null || value === undefined || value === '') {
            columnTypes[header] = { type: 'text' };
        } else if (!isNaN(Date.parse(value)) && isNaN(value) && new Date(value).getFullYear() > 1900) {
            columnTypes[header] = { type: 'date' };
        } else if (!isNaN(value) && value.toString().indexOf('.') === -1) {
            columnTypes[header] = { type: 'number' };
        } else {
            columnTypes[header] = { type: 'text' };
        }
    });
}


// --- FUNGSI PENGATURAN KOLOM ---

function populateColumnSelectionPopup(selectedHeaders) {
  const columnSelectionContainer = document.getElementById('column-selection');
  columnSelectionContainer.innerHTML = '';
  allHeaders.forEach(header => {
    const label = document.createElement('label');
    label.className = 'container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = header;
    checkbox.checked = selectedHeaders.includes(header);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16');
    path.setAttribute('pathLength', '575.0541381835938');
    path.classList.add('path');

    svg.appendChild(path);
    
    label.appendChild(checkbox);
    label.appendChild(svg);
    label.appendChild(document.createTextNode(` ${header.replace(/_/g, ' ').toUpperCase()}`));
    
    columnSelectionContainer.appendChild(label);
  });
}

// --- FUNGSI SORT ---

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

// --- FUNGSI FILTER (BARU & DIPERBARUI) ---

function renderFilterPopup() {
    const container = document.getElementById('filter-conditions-container');
    container.innerHTML = '';
    if (currentFilters.length === 0) {
        addFilterRow();
    } else {
        currentFilters.forEach(filter => addFilterRow(filter));
    }
}

function addFilterRow(filter = {}) {
    const container = document.getElementById('filter-conditions-container');
    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';

    const columnSelect = document.createElement('select');
    columnSelect.className = 'filter-column';
    currentTableHeaders.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header.replace(/_/g, ' ').toUpperCase();
        if (filter.column === header) option.selected = true;
        columnSelect.appendChild(option);
    });

    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'filter-operator';

    const valueContainer = document.createElement('div');
    valueContainer.className = 'filter-value-container';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-filter-btn';
    removeBtn.onclick = () => filterRow.remove();

    filterRow.appendChild(columnSelect);
    filterRow.appendChild(operatorSelect);
    filterRow.appendChild(valueContainer);
    filterRow.appendChild(removeBtn);
    container.appendChild(filterRow);

    columnSelect.addEventListener('change', () => {
        updateFilterInputs(columnSelect.value, operatorSelect, valueContainer);
    });

    updateFilterInputs(filter.column || currentTableHeaders[0], operatorSelect, valueContainer, filter);
}

function updateFilterInputs(column, operatorSelect, valueContainer, filter = {}) {
    const columnType = columnTypes[column].type;
    operatorSelect.innerHTML = '';
    valueContainer.innerHTML = '';

    let operators = [];
    switch (columnType) {
        case 'date': operators = ['di antara']; break;
        case 'number': operators = ['=', '!=', '>', '<', '>=', '<=']; break;
        case 'enum': operators = ['sama dengan', 'tidak sama dengan']; break;
        default: operators = ['mengandung', 'tidak mengandung', 'sama dengan', 'dimulai dengan', 'diakhiri dengan'];
    }

    operators.forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op.charAt(0).toUpperCase() + op.slice(1);
        if (filter.operator === op) option.selected = true;
        operatorSelect.appendChild(option);
    });

    if (columnType === 'date') {
        const dateStart = document.createElement('input');
        dateStart.type = 'date';
        dateStart.value = filter.value ? filter.value[0] : '';
        const dateEnd = document.createElement('input');
        dateEnd.type = 'date';
        dateEnd.value = filter.value ? filter.value[1] : '';
        valueContainer.append(dateStart, ' - ', dateEnd);
    } else if (columnType === 'enum') {
        const selectInput = document.createElement('select');
        columnTypes[column].options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.textContent = opt;
            if (filter.value === opt) optionEl.selected = true;
            selectInput.appendChild(optionEl);
        });
        valueContainer.appendChild(selectInput);
    } else {
        const textInput = document.createElement('input');
        textInput.type = columnType === 'number' ? 'number' : 'text';
        textInput.value = filter.value || '';
        textInput.placeholder = 'Masukkan nilai...';
        valueContainer.appendChild(textInput);
    }
}

function applyFiltersAndSort() {
    let data = [...allAlumniData];

    if (currentFilters.length > 0) {
        data = data.filter(row => {
            return currentFilters.every(filter => {
                const rowValue = row[filter.column];
                const filterValue = filter.value;
                if (rowValue === null || rowValue === undefined) return false;

                const colType = columnTypes[filter.column].type;
                if (colType === 'date') {
                    if (!filterValue[0] || !filterValue[1]) return true;
                    const rowDate = new Date(rowValue);
                    rowDate.setHours(0,0,0,0);
                    const startDate = new Date(filterValue[0]);
                    const endDate = new Date(filterValue[1]);
                    return rowDate >= startDate && rowDate <= endDate;
                } else if (colType === 'number') {
                    const numRowValue = parseFloat(rowValue);
                    const numFilterValue = parseFloat(filterValue);
                    if (isNaN(numFilterValue)) return true;
                    switch (filter.operator) {
                        case '=': return numRowValue === numFilterValue;
                        case '!=': return numRowValue !== numFilterValue;
                        case '>': return numRowValue > numFilterValue;
                        case '<': return numRowValue < numFilterValue;
                        case '>=': return numRowValue >= numFilterValue;
                        case '<=': return numRowValue <= numFilterValue;
                        default: return false;
                    }
                } else { // text and enum
                    const strRowValue = rowValue.toString().toLowerCase();
                    const strFilterValue = filterValue.toString().toLowerCase();
                    switch (filter.operator) {
                        case 'mengandung': return strRowValue.includes(strFilterValue);
                        case 'tidak mengandung': return !strRowValue.includes(strFilterValue);
                        case 'sama dengan': return strRowValue === strFilterValue;
                        case 'tidak sama dengan': return strRowValue !== strFilterValue;
                        case 'dimulai dengan': return strRowValue.startsWith(strFilterValue);
                        case 'diakhiri dengan': return strRowValue.endsWith(strFilterValue);
                        default: return false;
                    }
                }
            });
        });
    }

    const { column, direction } = currentSort;
    if (column) {
        data.sort((a, b) => {
            const valA = a[column];
            const valB = b[column];
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    filteredAlumniData = data;
    renderTableStructure();
    displayPage(1);
    deselectRow();
}

// --- EVENT LISTENERS ---

function closeAllPopups() {
    document.querySelectorAll('.popup-overlay').forEach(popup => {
        popup.style.display = 'none';
    });
    document.body.classList.remove('no-scroll');
}

document.getElementById('toggle-columns-btn').addEventListener('click', () => { closeAllPopups(); document.getElementById('popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('toggle-pagination-btn').addEventListener('click', () => { closeAllPopups(); document.getElementById('pagination-popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('toggle-sort-btn').addEventListener('click', () => { closeAllPopups(); document.getElementById('sort-popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('filter-btn').addEventListener('click', () => { closeAllPopups(); renderFilterPopup(); document.getElementById('filter-popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('add-data-btn').addEventListener('click', () => { closeAllPopups(); document.getElementById('add-method-choice-popup').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('download-data-btn').addEventListener('click', () => { closeAllPopups(); document.getElementById('download-popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });
document.getElementById('edit-data-btn').addEventListener('click', () => { alert(`Edit data: ${selectedAlumnusId}`); });
document.getElementById('delete-data-btn').addEventListener('click', () => { alert(`Hapus data: ${selectedAlumnusId}`); });

document.querySelectorAll('.close-button').forEach(btn => btn.addEventListener('click', closeAllPopups));
document.getElementById('manual-input-btn').addEventListener('click', () => { closeAllPopups(); populateAddDataForm(); document.getElementById('add-data-popup-container').style.display = 'flex'; document.body.classList.add('no-scroll'); });

document.getElementById('apply-columns-btn').addEventListener('click', () => {
  currentTableHeaders = Array.from(document.querySelectorAll('#column-selection input:checked')).map(cb => cb.value);
  applyFiltersAndSort();
  populateSortPopup(); 
  renderFilterPopup();
  closeAllPopups();
});

document.getElementById('apply-pagination-btn').addEventListener('click', () => {
  const select = document.getElementById('rows-per-page-select');
  rowsPerPage = select.value === 'all' ? filteredAlumniData.length : parseInt(select.value, 10);
  document.getElementById('pagination-controls').style.display = select.value === 'all' ? 'none' : 'block';
  displayPage(1);
  closeAllPopups();
});

document.getElementById('apply-sort-btn').addEventListener('click', () => {
  currentSort.column = document.getElementById('sort-column-select').value;
  currentSort.direction = document.querySelector('input[name="sort-direction"]:checked').value;
  applyFiltersAndSort();
  closeAllPopups();
});

document.getElementById('apply-filters-btn').addEventListener('click', () => {
    const filterRows = document.querySelectorAll('.filter-row');
    currentFilters = [];
    filterRows.forEach(row => {
        const column = row.querySelector('.filter-column').value;
        const operator = row.querySelector('.filter-operator').value;
        const valueContainer = row.querySelector('.filter-value-container');
        let value;

        if (columnTypes[column].type === 'date') {
            value = [
                valueContainer.querySelectorAll('input')[0].value,
                valueContainer.querySelectorAll('input')[1].value
            ];
            if (!value[0] || !value[1]) return;
        } else {
            value = valueContainer.querySelector('input, select').value;
            if (value === '') return;
        }
        
        currentFilters.push({ column, operator, value });
    });
    applyFiltersAndSort();
    closeAllPopups();
});

document.getElementById('reset-filters-btn').addEventListener('click', () => {
    currentFilters = [];
    applyFiltersAndSort();
    renderFilterPopup();
    closeAllPopups();
});

document.getElementById('add-filter-btn').addEventListener('click', () => addFilterRow());

// Sisa Event Listener
document.getElementById('select-all-btn').addEventListener('click', () => { document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = true); });
document.getElementById('deselect-all-btn').addEventListener('click', () => { document.querySelectorAll('#column-selection input').forEach(cb => cb.checked = false); });

// --- Fungsi Tambah Data & Unduh (Tidak Berubah) ---
function populateAddDataForm(){const form=document.getElementById("add-data-form");form.innerHTML="";const formHeaders=allHeaders.filter(header=>header!=="id");formHeaders.forEach(header=>{const label=document.createElement("label");label.textContent=header.replace(/_/g," ").toUpperCase();form.appendChild(label);let input;if(header==="sudah_bekerja"){input=document.createElement("select");const options=["Belum Bekerja","Sudah Bekerja"];options.forEach(optText=>{const option=document.createElement("option");option.value=optText;option.textContent=optText;input.appendChild(option)})}else if(header==="pekerjaan_sesuai"){input=document.createElement("select");const defaultOption=document.createElement("option");defaultOption.value="";defaultOption.textContent="-- Pilih Kesesuaian --";defaultOption.selected=true;input.appendChild(defaultOption);const options=["Sesuai","Tidak Sesuai"];options.forEach(optText=>{const option=document.createElement("option");option.value=optText;option.textContent=optText;input.appendChild(option)})}else{input=document.createElement("input");input.type=columnTypes[header]?.type==="number"?"number":"text"}input.name=header;input.style.width="100%";input.style.padding="8px";input.style.marginBottom="10px";input.style.boxSizing="border-box";input.classList.add("form-input-element");form.appendChild(input)})}
document.getElementById("submit-add-data-btn").addEventListener("click",async()=>{const form=document.getElementById("add-data-form");if(!form.checkValidity()){form.reportValidity();return}const formData=new FormData(form);const newAlumnus=Object.fromEntries(formData.entries());const primaryKeyValue=newAlumnus[primaryKeyColumn];if(!primaryKeyValue){alert(`Kolom primary key '${primaryKeyColumn}' wajib diisi!`);return}const{data:existingData,error:selectError}=await _supabase.from("alumni").select(primaryKeyColumn).eq(primaryKeyColumn,primaryKeyValue);if(selectError){console.error("Error checking for duplicates:",selectError);alert("Terjadi kesalahan saat memeriksa data: "+selectError.message);return}if(existingData&&existingData.length>0){alert(`Data dengan ${primaryKeyColumn} '${primaryKeyValue}' sudah ada.`);return}for(const key in newAlumnus){if(newAlumnus[key]==="")newAlumnus[key]=null}const{error:insertError}=await _supabase.from("alumni").insert([newAlumnus]);if(insertError){console.error("Error adding new alumni:",insertError);alert("Gagal menambahkan data: "+insertError.message)}else{alert("Data berhasil ditambahkan!");closeAllPopups();fetchAlumniData()}});
function getVisibleData(){return filteredAlumniData.slice((currentPage-1)*rowsPerPage,(currentPage-1)*rowsPerPage+rowsPerPage).map(row=>{const visibleRow={};currentTableHeaders.forEach(header=>{visibleRow[header]=row[header]});return visibleRow})}
document.getElementById("download-csv-btn").addEventListener("click",()=>{const data=getVisibleData();if(data.length===0)return alert("Tidak ada data untuk diunduh.");const headers=currentTableHeaders.join(",");const rows=data.map(row=>currentTableHeaders.map(header=>JSON.stringify(row[header],(key,value)=>value===null?"":value)).join(","));const csvContent="data:text/csv;charset=utf-8,"+headers+"\n"+rows.join("\n");const link=document.createElement("a");link.setAttribute("href",encodeURI(csvContent));link.setAttribute("download","alumni_data.csv");document.body.appendChild(link);link.click();document.body.removeChild(link);closeAllPopups()});
document.getElementById("download-json-btn").addEventListener("click",()=>{const data=getVisibleData();if(data.length===0)return alert("Tidak ada data untuk diunduh.");const jsonContent="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data,null,2));const link=document.createElement("a");link.setAttribute("href",jsonContent);link.setAttribute("download","alumni_data.json");document.body.appendChild(link);link.click();document.body.removeChild(link);closeAllPopups()});
document.getElementById("download-xlsx-btn").addEventListener("click",()=>{const data=getVisibleData();if(data.length===0)return alert("Tidak ada data untuk diunduh.");const worksheet=XLSX.utils.json_to_sheet(data,{header:currentTableHeaders});const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,worksheet,"Alumni");XLSX.writeFile(workbook,"alumni_data.xlsx");closeAllPopups()});
document.getElementById('menu-dots-btn').addEventListener('click',function(){document.getElementById('dropdown-menu').classList.toggle('show')});window.onclick=function(event){if(!event.target.matches('.menu-dots-button')){var dropdowns=document.getElementsByClassName("dropdown-content");for(var i=0;i<dropdowns.length;i++){var openDropdown=dropdowns[i];if(openDropdown.classList.contains('show')){openDropdown.classList.remove('show')}}}}

// Inisialisasi
fetchAlumniData();