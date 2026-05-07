const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('../Akurelg-wards-pu-locations.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('extracted_polling_units.txt', data.text);
    console.log('Text extracted to extracted_polling_units.txt');
    console.log('Total pages:', data.numpages);
}).catch(function(err) {
    console.error(err);
});
