const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync('extracted_polling_units.txt', pdfParser.getRawTextContent());
    console.log('Text extracted successfully!');
});

pdfParser.loadPDF("../Akurelg-wards-pu-locations.pdf");
