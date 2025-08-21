// visualisasi.js

// 1. Konfigurasi Supabase
const supabaseUrl = 'https://sgnavqdkkglhesglhrdi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbmF2cWRra2dsaGVzZ2xocmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODcyMzEsImV4cCI6MjA2NDA2MzIzMX0.nRQXlWwf-9CRjQVsff45aShM1_-WAqY1DZ0ND8r_i04';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Referensi DOM
const analysisButtons = document.getElementById('analysis-buttons');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('myChart');
const filterContainer = document.getElementById('filter-container');
const filterControls = document.getElementById('filter-controls');

let myChartInstance = null;
let allAlumniData = [];

// --- PALET WARNA ---
const colorPalette = {
    // Warna Kontekstual (untuk nilai spesifik)
    'Sudah Bekerja': 'rgba(22, 163, 74, 0.8)',
    'Belum Bekerja': 'rgba(220, 38, 38, 0.8)',
    'Sesuai': 'rgba(37, 99, 235, 0.8)',
    'Tidak Sesuai': 'rgba(217, 119, 6, 0.8)',

    // Warna Umum (untuk kategori dinamis)
    general: [
        'rgba(37, 99, 235, 0.8)', 'rgba(234, 88, 12, 0.8)',
        'rgba(2, 132, 199, 0.8)', 'rgba(100, 116, 139, 0.8)',
        'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
        'rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'
    ]
};

// Fungsi untuk mendapatkan warna berdasarkan label data
function getChartColors(labels) {
    const backgroundColors = [];
    let generalColorIndex = 0;
    labels.forEach(label => {
        if (colorPalette[label]) {
            backgroundColors.push(colorPalette[label]);
        } else {
            backgroundColors.push(colorPalette.general[generalColorIndex % colorPalette.general.length]);
            generalColorIndex++;
        }
    });
    return backgroundColors;
}

// 3. Fungsi Utama
async function initializePage() {
    try {
        const { data, error } = await _supabase.from('alumni').select('*');
        if (error) throw error;
        allAlumniData = data.filter(d => d.tanggal_mulai_program);
        setupEventListeners();
        // Secara default, tampilkan analisis pertama saat halaman dimuat
        runAnalysis('peserta_per_tahun');
        analysisButtons.querySelector('[data-analysis="peserta_per_tahun"]').classList.add('primary');
    } catch (error) {
        console.error('Gagal mengambil data:', error);
        chartContainer.innerHTML = `<p style="color: red;">Gagal memuat data. Silakan coba lagi nanti.</p>`;
        chartContainer.style.display = 'block';
    }
}

function setupEventListeners() {
    analysisButtons.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            analysisButtons.querySelectorAll('button').forEach(btn => btn.classList.remove('primary'));
            event.target.classList.add('primary');
            const analysisType = event.target.dataset.analysis;
            runAnalysis(analysisType);
        }
    });
}

// 4. Router Analisis
function runAnalysis(analysisType) {
    if (myChartInstance) myChartInstance.destroy();

    // Selalu perbarui filter berdasarkan analisis yang dipilih
    populateFilters(analysisType);
    const filteredData = applyFilters();

    switch (analysisType) {
        case 'peserta_per_tahun':
            generatePesertaPerTahunChart(filteredData);
            break;
        case 'distribusi_program':
            generateDistribusiProgramChart(filteredData);
            break;
        case 'status_bekerja':
            generateStackedBarChart(filteredData, 'judul_program', 'sudah_bekerja', 'Status Bekerja per Program');
            break;
        case 'kesesuaian_pekerjaan':
            generateStackedBarChart(filteredData, 'judul_program', 'pekerjaan_sesuai', 'Kesesuaian Pekerjaan per Program');
            break;
    }
}

// --- FUNGSI-FUNGSI GRAFIK SPESIFIK ---

function generatePesertaPerTahunChart(data) {
    const countsPerYear = data.reduce((acc, row) => {
        const year = new Date(row.tanggal_mulai_program).getFullYear();
        if (year) acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {});

    const sortedEntries = Object.entries(countsPerYear).sort((a, b) => a[0] - b[0]);
    const labels = sortedEntries.map(entry => entry[0]);
    const chartData = sortedEntries.map(entry => entry[1]);

    renderChart({
        type: 'line',
        labels,
        datasets: [{
            label: 'Jumlah Peserta',
            data: chartData,
            fill: true,
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            borderColor: 'rgba(37, 99, 235, 1)',
            tension: 0.1
        }],
        title: 'Tren Jumlah Peserta Pelatihan per Tahun'
    });
}

function generateDistribusiProgramChart(data) {
    const counts = data.reduce((acc, row) => {
        const key = row.judul_program || 'Lainnya';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(counts);
    renderChart({
        type: 'pie',
        labels: labels,
        datasets: [{
            label: 'Jumlah Peserta',
            data: Object.values(counts),
            backgroundColor: getChartColors(labels)
        }],
        title: 'Distribusi Peserta Berdasarkan Program Pelatihan'
    });
}

function generateStackedBarChart(data, categoryColumn, stackColumn, title) {
    const categories = [...new Set(data.map(row => row[categoryColumn]))];
    const stackValues = [...new Set(data.map(row => row[stackColumn]))].filter(Boolean);

    const datasets = stackValues.map(stackVal => ({
        label: stackVal,
        data: categories.map(cat =>
            data.filter(row => row[categoryColumn] === cat && row[stackColumn] === stackVal).length
        ),
        backgroundColor: colorPalette[stackVal] || getChartColors([stackVal])[0]
    }));

    renderChart({ type: 'bar', labels: categories, datasets, title, isStacked: true });
}

// --- FUNGSI UTILITAS (FILTER & RENDER) ---

function populateFilters(analysisType) {
    const currentFilterValues = {};
    document.querySelectorAll('#filter-controls select').forEach(select => {
        currentFilterValues[select.dataset.column] = select.value;
    });

    filterControls.innerHTML = '';
    let filterableColumns = [];

    if (analysisType === 'peserta_per_tahun') {
        filterableColumns.push('judul_program');
    }
    if (['distribusi_program', 'status_bekerja', 'kesesuaian_pekerjaan'].includes(analysisType)) {
        filterableColumns.push({ name: 'Tahun Program', column: 'tanggal_mulai_program' });
    }

    filterableColumns.forEach(filterInfo => {
        const isYearFilter = typeof filterInfo === 'object';
        const columnName = isYearFilter ? filterInfo.column : filterInfo;
        const displayName = isYearFilter ? filterInfo.name : `Filter ${columnName.replace(/_/g, ' ')}`;

        let uniqueValues = isYearFilter
            ? [...new Set(allAlumniData.map(row => new Date(row[columnName]).getFullYear()))].sort((a, b) => b - a)
            : [...new Set(allAlumniData.map(row => row[columnName]).filter(Boolean))];

        if (uniqueValues.length > 1) {
            const select = document.createElement('select');
            select.id = `filter-${columnName}`;
            select.className = 'menu-button';
            select.dataset.column = columnName;
            select.innerHTML = `<option value="all">Semua ${displayName}</option>`;
            uniqueValues.forEach(value => {
                select.innerHTML += `<option value="${value}">${value}</option>`;
            });

            // **PERBAIKAN KUNCI DI SINI**
            // Event listener sekarang akan selalu menjalankan analisis yang sedang aktif.
            select.addEventListener('change', () => {
                const activeAnalysis = document.querySelector('#analysis-buttons button.primary').dataset.analysis;
                runAnalysis(activeAnalysis);
            });

            if (currentFilterValues[columnName]) {
                select.value = currentFilterValues[columnName];
            }

            filterControls.appendChild(select);
        }
    });
    filterContainer.style.display = filterControls.innerHTML ? 'block' : 'none';
}

function applyFilters() {
    let filteredData = [...allAlumniData];
    document.querySelectorAll('#filter-controls select').forEach(select => {
        const column = select.dataset.column;
        const value = select.value;
        if (value !== 'all') {
            if (column.includes('tanggal')) {
                filteredData = filteredData.filter(row => String(new Date(row[column]).getFullYear()) === value);
            } else {
                filteredData = filteredData.filter(row => String(row[column]) === value);
            }
        }
    });
    return filteredData;
}

function renderChart({ type, labels, datasets, title, isStacked = false }) {
    if (document.getElementById('myChart') === null) {
        chartContainer.innerHTML = '<canvas id="myChart"></canvas>';
    }
    const ctx = document.getElementById('myChart').getContext('2d');

    if (labels.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#64748B";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk ditampilkan dengan filter yang dipilih.", ctx.canvas.width / 2, 50);
        chartContainer.style.display = 'block';
        return;
    }

    chartContainer.style.display = 'block';
    myChartInstance = new Chart(ctx, {
        type,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: title, font: { size: 18 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            let value = context.parsed.y ?? context.parsed;
                            label += new Intl.NumberFormat('id-ID').format(value);

                            if (['pie', 'doughnut'].includes(context.chart.config.type) && context.parsed !== null) {
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = ((context.parsed / total) * 100).toFixed(2) + '%';
                                label += ` (${percentage})`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: (type === 'bar' || type === 'line') ? {
                x: {
                    stacked: isStacked,
                    ticks: {
                        callback: function(value) {
                            const label = this.getLabelForValue(value);
                            return (label.length > 15) ? label.substring(0, 15) + '...' : label;
                        }
                    }
                },
                y: {
                    stacked: isStacked,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (Number.isInteger(value)) {
                                return new Intl.NumberFormat('id-ID').format(value);
                            }
                        }
                    }
                }
            } : {}
        }
    });
}

// Inisialisasi halaman
initializePage();