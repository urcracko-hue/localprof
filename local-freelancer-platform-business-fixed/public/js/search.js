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

// ---------------- Navigation
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// ---------------- Load Professions
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

            populateCategoryFilters(professions);
        }
    } catch (err) {
        console.error('Error loading professions:', err);
    }
}

// ---------------- Category Filters
function populateCategoryFilters(professions) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    const popular = professions.slice(0, 8);

    container.innerHTML = popular.map(prof => `
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

// ---------------- URL Params
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

// ---------------- Filters
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
        closeModal.addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
}

// ---------------- Location
function initLocationDetection() {
    const btn = document.getElementById('getLocationBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {

        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            return;
        }

        const status = document.getElementById('locationStatus');
        status.textContent = "Detecting...";
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            position => {

                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };

                updateLocationStatus(true);
                btn.disabled = false;

                searchFreelancers();
            },
            err => {
                console.error(err);
                status.textContent = "Failed";
                btn.disabled = false;
            }
        );
    });
}

function updateLocationStatus(detected) {
    const btn = document.getElementById('getLocationBtn');
    const status = document.getElementById('locationStatus');
    if (!btn || !status) return;

    status.textContent = detected ? "Location Set ✓" : "Detect Location";
    btn.classList.toggle('active', detected);
}

// ---------------- SEARCH MAIN
async function searchFreelancers() {

    const grid = document.getElementById('resultsGrid');
    const noResults = document.getElementById('noResults');
    const pagination = document.getElementById('pagination');
    const info = document.getElementById('resultsInfo');

    if (!grid || !noResults || !pagination || !info) return;

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p>Finding professionals near you...</p>
        </div>
    `;

    noResults.style.display = "none";
    pagination.style.display = "none";

    const params = new URLSearchParams();

    const profession = document.getElementById('professionFilter').value;
    const radius = document.getElementById('radiusFilter').value;

    if (profession !== "all") params.set("profession", profession);

    if (userLocation) {
        params.set('latitude', userLocation.latitude);
        params.set('longitude', userLocation.longitude);
        params.set('radius', radius);
    }

    params.set("page", currentPage);
    params.set("limit", 12);

    try {
        const res = await fetch(`/api/freelancers/search?${params}`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {

            displayResults(data.data);

            totalPages = data.pagination.pages;

            if (totalPages > 1) {
                pagination.style.display = "flex";
                document.getElementById('pageInfo').textContent =
                    `Page ${currentPage} of ${totalPages}`;
            }

            info.innerHTML =
                `<span>Found ${data.pagination.total} professional(s)</span>`;

        } else {
            grid.innerHTML = "";
            noResults.style.display = "block";
            info.innerHTML = `<span>No results found</span>`;
        }

    } catch (err) {
        console.error(err);
        grid.innerHTML = `<p class="error-message">Error loading results</p>`;
    }
}

// ---------------- Display Results
function displayResults(list) {

    const grid = document.getElementById('resultsGrid');

    grid.innerHTML = list.map(f => `
        <div class="freelancer-card" onclick="showFreelancerDetail('${f._id}')">
            <div class="card-name">${escapeHtml(f.fullName)}</div>
            <div>${f.profession}</div>
        </div>
    `).join('');
}

// ---------------- Freelancer Detail (FIXED)
async function showFreelancerDetail(id) {

    const modal = document.getElementById('freelancerModal');
    const container = document.getElementById('freelancerDetail');

    if (!modal || !container) return;

    modal.classList.add('show');

    container.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p>Loading...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/freelancers/${id}`);
        const data = await res.json();

        if (data.success) {

            const f = data.data;

            container.innerHTML = `
                <h2>${escapeHtml(f.fullName)}</h2>
                <p>${f.profession}</p>
                <p>Experience: ${f.experience} years</p>
                <p>Rate: ₹${f.rupeesPerHour}/hr</p>
                <p>${escapeHtml(f.location.area)}, ${escapeHtml(f.location.city)}</p>
                <a href="tel:+91${f.phoneNumber}" class="contact-btn">
                    📞 Call ${f.phoneNumber}
                </a>
            `;
        }

    } catch (err) {
        container.innerHTML = "<p>Error loading profile</p>";
    }
}

// ---------------- Reset
function resetFilters() {
    document.getElementById('professionFilter').value = "all";
    document.getElementById('radiusFilter').value = "10";
    currentPage = 1;
    searchFreelancers();
}

// ---------------- Utils
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
