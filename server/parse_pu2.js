const fs = require('fs');

const text = fs.readFileSync('extracted_polling_units.txt', 'utf-8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l);

const data = {
    "Akure North": {},
    "Akure South": {}
};

let currentLGA = "Akure North"; // Defaults based on PDF order
let currentWard = "Unknown Ward";

// Bounding box for Akure
function getRandomCoord() {
    const lat = 7.20 + Math.random() * 0.10;
    const lng = 5.15 + Math.random() * 0.10;
    return [lng, lat];
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('LOCAL    GOVT  : AKURE    NOR  TH')) {
        currentLGA = "Akure North";
    } else if (line.includes('LOCAL    GOVT  : AKURE    SOUTH')) {
        currentLGA = "Akure South";
    }

    // Wards usually match "01  - APONMU" and are followed by "W ARD" or "WARD"
    if (line.match(/^[0-9]{2}\s*-/) || (i + 1 < lines.length && lines[i+1].includes('W ARD'))) {
        if (line.match(/^[0-9]{2}\s*-/)) {
            currentWard = "WARD " + line;
            if (!data[currentLGA][currentWard]) {
                data[currentLGA][currentWard] = [];
            }
        }
    } 
    // Polling Units match "001 - COMP HIGH SCH"
    else if (line.match(/^[0-9]{3}\s*-/)) {
        const puName = line.replace(/^[0-9]{3}\s*-\s*/, '').trim();
        if (!data[currentLGA][currentWard]) {
            data[currentLGA][currentWard] = [];
        }
        data[currentLGA][currentWard].push({
            name: puName,
            coordinates: getRandomCoord()
        });
    }
}

fs.writeFileSync('../client/src/data/polling_units_structured.json', JSON.stringify(data, null, 2));
console.log('Successfully generated structured polling units');
