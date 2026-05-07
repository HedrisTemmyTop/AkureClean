const fs = require('fs');

const text = fs.readFileSync('extracted_polling_units.txt', 'utf-8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l);

const wards = {};
let currentWard = 'General';

// Rough Akure bounding box: 
// Lng: 5.15 to 5.25
// Lat: 7.20 to 7.30
function getRandomCoord() {
    const lat = 7.20 + Math.random() * 0.10;
    const lng = 5.15 + Math.random() * 0.10;
    return [lng, lat];
}

for (let line of lines) {
    if (line.includes('W ARD') || line.includes('WARD')) {
        // e.g. "01  - AGAMO/OKE-OORE/AKOMOW       A"
        currentWard = line.replace('W ARD', '').trim();
        if (!wards[currentWard]) wards[currentWard] = [];
    } else if (line.match(/^[0-9]{3}\s*-/)) {
        // e.g. "015 - ST  ANDREW'S    II"
        const puName = line.replace(/^[0-9]{3}\s*-\s*/, '').trim();
        if (!wards[currentWard]) wards[currentWard] = [];
        wards[currentWard].push({
            name: puName,
            coordinates: getRandomCoord()
        });
    }
}

// Clean up Ward names
const cleanWards = {};
for (const key of Object.keys(wards)) {
    if (wards[key].length > 0) {
        cleanWards[key] = wards[key];
    }
}

fs.writeFileSync('polling_units.json', JSON.stringify(cleanWards, null, 2));
console.log('Parsed polling units to polling_units.json');
