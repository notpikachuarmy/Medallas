const MEDALS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1uxeXCUyWi2kLAWEGJjZ91zutr18sr7_QjHqxfPVzgCA/export?format=csv&gid=0';
const USERS_SHEET_URL  = 'https://docs.google.com/spreadsheets/d/1Pri9HhHGipD08e847iUKruXPLzG9tWki3N5rQPu2cMw/export?format=csv&gid=0';

let medals = [];
let users = [];
let obtainedMedals = JSON.parse(localStorage.getItem('misMedallas')) || [];
const rarezaPuntos = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5 };

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([fetchCSV(MEDALS_SHEET_URL), fetchCSV(USERS_SHEET_URL)])
        .then(([medalsData, usersData]) => {
            medals = medalsData;
            users = usersData;
            
            if (document.getElementById('medallasList')) initIndex();
            if (document.getElementById('userMedals')) initProfile();
        });
});

// ==== UTILIDADES ====
async function fetchCSV(url) {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const headers = lines.shift().split(',').map(h => h.trim());
    return lines.map(line => {
        const values = parseCSVLine(line);
        let obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ? values[i].trim() : '');
        return obj;
    });
}

function parseCSVLine(line) {
    const result = []; let current = ''; let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
        else current += char;
    }
    result.push(current); return result;
}

// ==== LÓGICA PRINCIPAL (INDEX) ====
function initIndex() {
    const searchUser = document.getElementById('searchUser');
    const autocompleteList = document.getElementById('autocompleteList');
    const modal = document.getElementById('rankingModal');

    // Autocomplete
    searchUser.addEventListener('input', () => {
        const query = searchUser.value.toLowerCase().trim();
        autocompleteList.innerHTML = '';
        if (!query) return;
        const matches = users.filter(u => u.NombreUsuario.toLowerCase().includes(query));
        matches.forEach(u => {
            const div = document.createElement('div');
            div.textContent = u.NombreUsuario;
            div.onclick = () => window.location.href = `perfil.html?user=${encodeURIComponent(u.NombreUsuario)}`;
            autocompleteList.appendChild(div);
        });
    });

    // Eventos Filtros
    document.getElementById('searchMedal').addEventListener('input', renderMedals);
    document.getElementById('hideObtained').addEventListener('change', renderMedals);
    document.getElementById('sortOrder').addEventListener('change', renderMedals);
    document.querySelectorAll('.rareza-filter input').forEach(cb => cb.addEventListener('change', renderMedals));

    // Modal Ranking
    document.getElementById('openRanking').onclick = () => {
        generarRanking();
        modal.style.display = "block";
    };
    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

    renderMedals();
}

function toggleMedal(id) {
    if (obtainedMedals.includes(id)) {
        obtainedMedals = obtainedMedals.filter(m => m !== id);
    } else {
        obtainedMedals.push(id);
    }
    localStorage.setItem('misMedallas', JSON.stringify(obtainedMedals));
    renderMedals();
}

function renderMedals() {
    const list = document.getElementById('medallasList');
    const query = document.getElementById('searchMedal').value.toLowerCase();
    const hide = document.getElementById('hideObtained').checked;
    const sort = document.getElementById('sortOrder').value;
    const rarezas = Array.from(document.querySelectorAll('.rareza-filter input:checked')).map(c => c.value);

    let filtered = medals.filter(m => {
        const matchesName = m.Nombre.toLowerCase().includes(query);
        const matchesRarity = rarezas.includes(m.Rareza);
        const isObtained = obtainedMedals.includes(m.ID);
        if (hide && isObtained) return false;
        return matchesName && matchesRarity;
    });

    if (sort === 'rarity') {
        filtered.sort((a, b) => rarezaPuntos[b.Rareza] - rarezaPuntos[a.Rareza]);
    }

    list.innerHTML = '';
    filtered.forEach(m => {
        const isObtained = obtainedMedals.includes(m.ID);
        const div = document.createElement('div');
        div.className = `medalla ${m.Rareza} ${isObtained ? 'obtained' : ''}`;
        div.onclick = () => toggleMedal(m.ID);
        div.innerHTML = `
            <img src="${m.ImagenURL}" alt="${m.Nombre}">
            <div>
                <h2>${m.Nombre}</h2>
                <p>${m.Descripción}</p>
                <span class="rarity-${m.Rareza}" style="font-weight:bold">${m.Rareza}</span>
            </div>
        `;
        list.appendChild(div);
    });
}

// ==== RANKING DETALLADO ====
function generarRanking() {
    const rankingElem = document.getElementById('rankingList');
    const ranking = users.map(u => {
        const ids = u.MedallasObtenidas ? u.MedallasObtenidas.split(',').map(id => id.trim()) : [];
        const conteo = {N:0, R:0, SR:0, SSR:0, UR:0};
        let pts = 0;
        ids.forEach(mid => {
            const med = medals.find(m => m.ID === mid);
            if(med) { conteo[med.Rareza]++; pts += rarezaPuntos[med.Rareza]; }
        });
        return {...u, total: ids.length, conteo, pts};
    }).sort((a, b) => b.pts - a.pts);

    rankingElem.innerHTML = ranking.map((u, i) => `
        <div class="ranking-item" style="display:flex; align-items:center; gap:15px; margin-bottom:12px; background:#252525; padding:15px; border-radius:12px; border: 1px solid #333;">
            <div style="font-size:1.5rem; font-weight:bold; width:35px; color:#555">${i+1}</div>
            <img src="${u.AvatarURL}" style="width:55px; height:55px; border-radius:50%; border:2px solid #444">
            <div style="flex-grow:1">
                <a href="perfil.html?user=${encodeURIComponent(u.NombreUsuario)}" style="color:gold; text-decoration:none; font-weight:bold; font-size:1.1rem">${u.NombreUsuario}</a>
                <div style="font-size:0.85rem; margin: 4px 0;">Total: <strong>${u.total}</strong> | Puntos: <strong>${u.pts}</strong></div>
                <div style="display:flex; gap:4px; flex-wrap:wrap">
                    ${['N','R','SR','SSR','UR'].map(r => `<span class="rarity-badge rarity-${r}">${r}: ${u.conteo[r]}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// ==== PERFIL ====
function initProfile() {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('user');
    const user = users.find(u => u.NombreUsuario.toLowerCase() === userName?.toLowerCase());
    
    if (!user) { document.getElementById('username').textContent = "Usuario no encontrado"; return; }

    document.getElementById('username').textContent = user.NombreUsuario;
    document.getElementById('avatar').src = user.AvatarURL;

    const userMedalIds = user.MedallasObtenidas ? user.MedallasObtenidas.split(',').map(id => id.trim()) : [];
    document.getElementById('totalMedals').textContent = `Medallas totales: ${userMedalIds.length}`;

    const list = document.getElementById('userMedals');
    list.innerHTML = '';
    userMedalIds.forEach(mid => {
        const m = medals.find(med => med.ID === mid);
        if(m) {
            const div = document.createElement('div');
            div.className = `medalla ${m.Rareza}`;
            div.innerHTML = `<img src="${m.ImagenURL}"><div><h2>${m.Nombre}</h2><p>${m.Descripción}</p></div>`;
            list.appendChild(div);
        }
    });
}
