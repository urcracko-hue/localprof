// ===============================
// Search Page JavaScript (FINAL)
// ===============================

let currentPage = 1;
let totalPages = 1;
let userLocation = null;
let professions = [];

document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    loadProfessions();
    initFilters();
    parseURLParams();
    initLocationDetection();
});

// -------------------------------
// Navigation Toggle
// -------------------------------
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// -------------------------------
// Load Professions
// -------------------------------
async function loadProfessions() {
    const select = document.getElementById('professionFilter');
    if (!select) return;

    try {
        const response = await fetch('/api/freelancers/professions');
        const data = await response.json();

        if (data.success) {
            professions = data.data;

            professions.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id;
                option.textContent = `${prof.icon} ${prof.name}`;
                select.appendChild(option);
            });

            populateCategoryFilters(data.data);
        }
    } catch (error) {
        console.error('Error loading professions:', error);
    }
}

// -------------------------------
// Category Quick Filters
// -------------------------------
function populateCategoryFilters(professions) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    const popularProfs = professions.slice(0, 8);

    container.innerHTML = popularProfs.map(prof => `
        <button class="category-filter-btn" data-profession="${prof.id}">
            <span>${prof.icon}</span>
            <span>${prof.name}</span>
        </button>
    `).join('');

    container.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const profession = this.dataset.profession;
            document.getElementById('professionFilter').value = profession;

            container.querySelectorAll('.category-filter-btn')
                .forEach(b => b.classList.remove('active'));

            this.classList.add('active');

            currentPage = 1;
            searchFreelancers();
        });
    });
}

// -------------------------------
// Parse URL
// -------------------------------
function parseURLParams() {
    const params = new URLSearchParams(window.location.search);

    const profession = params.get('profession');
    const lat = params.get('lat');
    const lng = params.get('lng');

    if (profession) {
        document.getElementById('professionFilter').value = profession;
    }

    if (lat && lng) {
        userLocation = {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        };
        updateLocationStatus(true);
    }

    searchFreelancers();
}

// -------------------------------
// Filters + Pagination
// -------------------------------
function initFilters() {
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetFilters');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentPage = 1;
            searchFreelancers();
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                searchFreelancers();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                searchFreelancers();
            }
        });
    }

    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('freelancerModal');

    if (closeModal && modal) {
        closeModal.addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// -------------------------------
// Location Detection
// -------------------------------
function initLocationDetection() {
    const locationBtn = document.getElementById('getLocationBtn');
    if (!locationBtn) return;

    locationBtn.addEventListener('click', function () {

        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }

        const statusSpan = document.getElementById('locationStatus');

        statusSpan.textContent = 'Detecting...';
        locationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {

                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                updateLocationStatus(true);
                locationBtn.disabled = false;

                searchFreelancers();
            },
            (error) => {
                console.error(error);
                statusSpan.textContent = 'Failed - Try Again';
                locationBtn.disabled = false;
            }
        );
    });
}

function updateLocationStatus(detected) {
    const locationBtn = document.getElementById('getLocationBtn');
    const statusSpan = document.getElementById('locationStatus');

    if (!locationBtn || !statusSpan) return;

    statusSpan.textContent = detected
        ? 'Location Set ✓'
        : 'Detect Location';

    locationBtn.classList.toggle('active', detected);
}

// -------------------------------
// SEARCH MAIN FUNCTION (FIXED)
// -------------------------------
async function searchFreelancers() {

    const resultsGrid = document.getElementById('resultsGrid');
    const noResults = document.getElementById('noResults');
    const pagination = document.getElementById('pagination');
    const resultsInfo = document.getElementById('resultsInfo');

    if (!resultsGrid || !noResults || !pagination || !resultsInfo) {
        console.error("Search UI missing");
        return;
    }

    // Safe loading UI
    resultsGrid.innerHTML = `
        <div class="loading-state" id="loadingState">
            <div class="loader"></div>
            <p>Finding professionals near you...</p>
        </div>
    `;

    noResults.style.display = 'none';
    pagination.style.display = 'none';

    const params = new URLSearchParams();

    const profession = document.getElementById('professionFilter').value;
    const radius = document.getElementById('radiusFilter').value;

    if (profession !== 'all') params.set('profession', profession);

    if (userLocation) {
        params.set('latitude', userLocation.latitude);
        params.set('longitude', userLocation.longitude);
        params.set('radius', radius);
    }

    params.set('page', currentPage);
    params.set('limit', 12);

    try {
        const response = await fetch(`/api/freelancers/search?${params}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {

            displayResults(data.data);

            totalPages = data.pagination.pages;

            if (totalPages > 1) {
                pagination.style.display = 'flex';
                document.getElementById('pageInfo').textContent =
                    `Page ${currentPage} of ${totalPages}`;
            }

            resultsInfo.innerHTML =
                `<span>Found ${data.pagination.total} professional(s)</span>`;

        } else {
            resultsGrid.innerHTML = '';
            noResults.style.display = 'block';
            resultsInfo.innerHTML = `<span>No results found</span>`;
        }

    } catch (err) {
        console.error('Search error:', err);
        resultsGrid.innerHTML =
            `<p class="error-message">Error loading results</p>`;
    }
}

// -------------------------------
// Display Results
// -------------------------------
function displayResults(freelancers) {
    const grid = document.getElementById('resultsGrid');

    grid.innerHTML = freelancers.map(f => `
        <div class="freelancer-card" onclick="showFreelancerDetail('${f._id}')">
            <div class="card-name">${escapeHtml(f.fullName)}</div>
            <div>${f.profession}</div>
        </div>
    `).join('');
}

// -------------------------------
function resetFilters() {
    document.getElementById('professionFilter').value = 'all';
    document.getElementById('radiusFilter').value = '10';
    currentPage = 1;
    searchFreelancers();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
