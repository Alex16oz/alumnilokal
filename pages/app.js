const { createClient } = supabase

// URL dan kunci Supabase Anda
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04'
const _supabase = createClient(supabaseUrl, supabaseKey)

async function getAlumni() {
  const { data, error } = await _supabase
    .from('alumni')
    .select('*');

  if (error) {
    console.error('Error fetching alumni:', error);
    return;
  }

  const alumniContainer = document.getElementById('alumni-container');
  alumniContainer.innerHTML = ''; // Mengosongkan kontainer

  if (data.length === 0) {
    alumniContainer.innerHTML = '<p>Tidak ada data alumni yang ditemukan.</p>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Membuat header tabel dari kunci objek pertama
  const headers = Object.keys(data[0]);
  const headerRow = document.createElement('tr');
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText.replace(/_/g, ' ').toUpperCase(); // Mengganti _ dengan spasi dan membuat huruf besar
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Mengisi baris tabel dengan data alumni
  data.forEach(alumnus => {
    const row = document.createElement('tr');
    headers.forEach(header => {
      const cell = document.createElement('td');
      cell.textContent = alumnus[header];
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  alumniContainer.appendChild(table);
}

// Memanggil fungsi untuk menampilkan data saat halaman dimuat
getAlumni();