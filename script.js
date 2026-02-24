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
            initApp();
        });
});

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

function initApp() {
    const medallasList = document.getElementById('medallasList');
    if (!medallasList) return;

    // --- Eventos de Filtros ---
    document.getElementById('searchMedal').addEventListener('input', renderMedals);
    document.getElementById('hideObtained').addEventListener('change', renderMedals);
    document.getElementById('sortOrder').addEventListener('change', renderMedals);
    document.querySelectorAll('.rareza-filter input').forEach(cb => cb.addEventListener('change', renderMedals));

    // --- Modal Ranking ---
    const modal = document.getElementById('rankingModal');
    document.getElementById('openRanking').onclick = () => {
        generarRanking();
        modal.style.display = "block";
    }
    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

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
    const medallasList = document.getElementById('medallasList');
    const medalQuery = document.getElementById('searchMedal').value.toLowerCase();
    const hideObtained = document.getElementById('hideObtained').checked;
    const sortOrder = document.getElementById('sortOrder').value;
    const checkedRarezas = Array.from(document.querySelectorAll('.rareza-filter input:checked')).map(c => c.value);

    let filtered = medals.filter(m => {
        const matchesMedal = m.Nombre.toLowerCase().includes(medalQuery);
        const matchesRareza = checkedRarezas.includes(m.Rareza);
        const isObtained = obtainedMedals.includes(m.ID);
        if (hideObtained && isObtained) return false;
        return matchesMedal && matchesRareza;
    });

    // --- Ordenar ---
    if (sortOrder === 'rarity') {
        filtered.sort((a, b) => rarezaPuntos[b.Rareza] - rarezaPuntos[a.Rareza]);
    }

    medallasList.innerHTML = '';
    filtered.forEach(m => {
        const isObtained = obtainedMedals.includes(m.ID);
        const div = document.createElement('div');
        div.className = `medalla ${m.Rareza} ${isObtained ? 'obtained' : ''}`;
        div.onclick = () => toggleMedal(m.ID);
        div.innerHTML = `
            <img src="${m.ImagenURL}" alt="${m.Nombre}">
            <div>
                <h2>${m.Nombre} <small style="font-size:0.7rem; opacity:0.6">ID: ${m.ID}</small></h2>
                <p>${m.Descripción}</p>
                <span class="rarity-${m.Rareza}" style="font-weight:bold">${m.Rareza}</span>
            </div>
        `;
        medallasList.appendChild(div);
    });
}

function generarRanking() {
    const rankingElem = document.getElementById('rankingList');
    const ranking = users.map(u => {
        const medallasIds = u.MedallasObtenidas ? u.MedallasObtenidas.split(',').map(id => id.trim()) : [];
        const conteo = {N:0, R:0, SR:0, SSR:0, UR:0};
        let totalPuntos = 0;
        medallasIds.forEach(mid => {
            const med = medals.find(m => m.ID === mid);
            if(med) {
                conteo[med.Rareza]++;
                totalPuntos += rarezaPuntos[med.Rareza];
            }
        });
        return {...u, totalMedallas: medallasIds.length, conteo, totalPuntos};
    }).sort((a, b) => b.totalPuntos - a.totalPuntos);

    rankingElem.innerHTML = ranking.map((u, i) => `
        <div class="ranking-item" style="display:flex; align-items:center; gap:15px; margin-bottom:10px; background:#222; padding:10px; border-radius:10px;">
            <div style="font-size:1.5rem; font-weight:bold; width:30px">${i+1}</div>
            <img src="${u.AvatarURL}" style="width:50px; height:50px; border-radius:50%">
            <div style="flex-grow:1">
                <a href="perfil.html?user=${encodeURIComponent(u.NombreUsuario)}" style="color:gold; text-decoration:none; font-weight:bold">${u.NombreUsuario}</a>
                <div style="font-size:0.8rem">Medallas: ${u.totalMedallas} | Puntos: ${u.totalPuntos}</div>
            </div>
        </div>
    `).join('');
}
