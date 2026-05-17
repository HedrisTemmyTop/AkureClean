/**
 * Polling Units Cleaner
 * ----------------------
 * 1. Fixes OCR word-break artifacts (spaces inserted mid-word)
 * 2. Collapses remaining extra whitespace
 * 3. Removes duplicate polling units within each ward
 *
 * Usage:  node clean_polling_units.js input.json output.json
 */

const fs = require("fs");

const INPUT_FILE = process.argv[2] || "polling_units.json";
const OUTPUT_FILE = process.argv[3] || "polling_units_cleaned.json";

// Order matters: longer/more specific patterns before shorter ones
const FIXES = [
  // --- Common word fragments ---
  [/\bSP ACE\b/g, "SPACE"],
  [/\bPR Y\b/g, "PRY"],
  [/\bP RY\b/g, "PRY"],
  [/\bMOT OR\b/g, "MOTOR"],
  [/\bNEP A\b/g, "NEPA"],
  [/\bFUT A\b/g, "FUTA"],

  // --- ST-prefix breaks (specific first, generic last) ---
  [/\bFILLING ST ATION\b/g, "FILLING STATION"],
  [/\bPOLICE ST ATION\b/g, "POLICE STATION"],
  [/\bPETROL ST ATION\b/g, "PETROL STATION"],
  [/\bST ATION\b/g, "STATION"],
  [/\bST ORE\b/g, "STORE"],
  [/\bST ATE\b/g, "STATE"],
  [/\bST AFF\b/g, "STAFF"],
  [/\bST ADIUM\b/g, "STADIUM"],
  [/\bST OP\b/g, "STOP"],

  // --- GA TE ---
  [/\bGA TE\b/g, "GATE"],

  // --- Health / Medical ---
  [/\bHEAL TH\b/g, "HEALTH"],
  [/\bHOSPIT AL\b/g, "HOSPITAL"],
  [/\bMA TERNITY\b/g, "MATERNITY"],
  [/\bVER TINAR Y\b/g, "VETERINARY"],
  [/\bVET ERINAR Y\b/g, "VETERINARY"],

  // --- Courts / Legal ---
  [/\bCOUR T\b/g, "COURT"],
  [/\bMAGISTRA TE\b/g, "MAGISTRATE"],
  [/\bCUST OMAR Y\b/g, "CUSTOMARY"],
  [/\bCUST OM\b/g, "CUSTOM"],

  // --- Schools / Education ---
  [/\bSECONDAR Y\b/g, "SECONDARY"],
  [/\bPRIMAR YSCHOOL\b/g, "PRIMARY SCHOOL"],
  [/\bPRIMAR Y SCHL\b/g, "PRIMARY SCHOOL"],
  [/\bPRIMAR Y\b/g, "PRIMARY"],
  [/\bUNIVERSIT Y\b/g, "UNIVERSITY"],
  [/\bSEMINAR Y\b/g, "SEMINARY"],
  [/\bLIBRAR Y\b/g, "LIBRARY"],

  // --- -TION / -ATION words ---
  [/\bCORPORA TION\b/g, "CORPORATION"],
  [/\bCOMMUNICA TION\b/g, "COMMUNICATION"],
  [/\bRECREA TION\b/g, "RECREATION"],
  [/\bRECONCILIA TION\b/g, "RECONCILIATION"],
  [/\bINTERNA TIONAL\b/g, "INTERNATIONAL"],
  [/\bNA TIONAL\b/g, "NATIONAL"],
  [/\bFOUNDA TION\b/g, "FOUNDATION"],
  [/\bINSTITU TION\b/g, "INSTITUTION"],

  // --- -TY / -ITY words ---
  [/\bASSEMBL Y\b/g, "ASSEMBLY"],
  [/\bCOMMUNIT Y\b/g, "COMMUNITY"],
  [/\bAUTHORIT Y\b/g, "AUTHORITY"],
  [/\bINDUSTR Y\b/g, "INDUSTRY"],

  // --- -ATE words ---
  [/\bEST ATE\b/g, "ESTATE"],
  [/\bDIPLOMA TE\b/g, "DIPLOMATE"],
  [/\bCA TER\b/g, "CATER"],

  // --- Transport / Infrastructure ---
  [/\bBUS ST OP\b/g, "BUS STOP"],
  [/\bBUST OP\b/g, "BUSSTOP"],
  [/\bSA WMILL\b/g, "SAWMILL"],
  [/\bLA YOUT\b/g, "LAYOUT"],
  [/\bQUAR TERS\b/g, "QUARTERS"],
  [/\bFURNIT URE\b/g, "FURNITURE"],
  [/\bPHOT O\b/g, "PHOTO"],
  [/\bBOR EHOLE\b/g, "BOREHOLE"],

  // --- Food / Hospitality ---
  [/\bREST AURANT\b/g, "RESTAURANT"],
  [/\bEA TER Y\b/g, "EATERY"],
  [/\bHOT AL\b/g, "HOTEL"],
  [/\bHONEY MOON\b/g, "HONEYMOON"],
  [/\bCA SSAVA\b/g, "CASSAVA"],
  [/\bCASSA VA\b/g, "CASSAVA"],

  // --- Religion ---
  [/\bJEHOV AH\b/g, "JEHOVAH"],
  [/\bSAL VATION\b/g, "SALVATION"],
  [/\bHALLELUY AH\b/g, "HALLELUYAH"],

  // --- Misc common broken words ---
  [/\bONL Y\b/g, "ONLY"],
  [/\bSA VE\b/g, "SAVE"],
  [/\bDA VID\b/g, "DAVID"],
  [/\bGLOR Y\b/g, "GLORY"],
  [/\bROY AL\b/g, "ROYAL"],
  [/\bVICT OR Y\b/g, "VICTORY"],
  [/\bVINT AGE\b/g, "VINTAGE"],
  [/\bMAR Y\b/g, "MARY"],
  [/\bMAR TINS\b/g, "MARTINS"],
  [/\bMAR VELOUS\b/g, "MARVELOUS"],
  [/\bMOUNT AIN\b/g, "MOUNTAIN"],
  [/\bMA YF ARE\b/g, "MAYFARE"],
  [/\bMA THEWS\b/g, "MATHEWS"],
  [/\bMA THEW\b/g, "MATHEW"],
  [/\bMA TTEW\b/g, "MATTHEW"],
  [/\bAA YE\b/g, "AAYE"],
  [/\bBA YDUK\b/g, "BAYDUK"],
  [/\bYOT OMI\b/g, "YOTOMI"],
  [/\bYEW ANDE\b/g, "YEWANDE"],
  [/\bMARIY AN\b/g, "MARIYAN"],
  [/\bMAR Y AN\b/g, "MARYAN"],

  // --- Local name fragments ---
  [/\bAYET ORO\b/g, "AYETORO"],
  [/\bAYET OT O\b/g, "AYETOTO"],
  [/\bAYET OROS\b/g, "AYETOROS"],
  [/\bALA YERE\b/g, "ALAYERE"],
  [/\bOLUW ATEDO\b/g, "OLUWATEDO"],
  [/\bOLUW ATUYI\b/g, "OLUWATUYI"],
  [/\bOLUW A\b/g, "OLUWA"],
  [/\bOLUAP AF A\b/g, "OLUAPAFA"],
  [/\bAP AF A\b/g, "APAFA"],
  [/\bKOLA WOLE\b/g, "KOLAWOLE"],
  [/\bADEBOW ALES\b/g, "ADEBOWALES"],
  [/\bADEBOW ALE\b/g, "ADEBOWALE"],
  [/\bADEBA YOS\b/g, "ADEBAYOS"],
  [/\bIBIT OYES\b/g, "IBITOYES"],
  [/\bOLOT AS\b/g, "OLOTAS"],
  [/\bMA YEGUNS\b/g, "MAYEGUNS"],
  [/\bATEWOLO-GUN\b/g, "ATEWOLOGUN"],
  [/\bADESA YE\b/g, "ADESAYE"],
  [/\bFIW ASA YE\b/g, "FIWASAYE"],
  [/\bOWONIF ARI\b/g, "OWONIFARI"],
  [/\bIW ALEW A\b/g, "IWALEWA"],
  [/\bERINW A\b/g, "ERINWA"],
  [/\bTUTUGBUW A\b/g, "TUTUGBUWA"],
  [/\bUT AMO\b/g, "UTAMO"],
  [/\bAGBOT A\b/g, "AGBOTA"],
  [/\bOP ARA\b/g, "OPARA"],
  [/\bOP A\b/g, "OPA"],
  [/\bOLOKUT A\b/g, "OLOKUTA"],
  [/\bOLOUNT A\b/g, "OLOUNTA"],
  [/\bOLUNT A\b/g, "OLUNTA"],
  [/\bARA TUNSIN\b/g, "ARATUNSIN"],
  [/\bARA TA\b/g, "ARATA"],
  [/\bPOT OKI\b/g, "POTOKI"],
  [/\bTEMIT OPE\b/g, "TEMITOPE"],
  [/\bADET OLA\b/g, "ADETOLA"],
  [/\bONIY AN\b/g, "ONIYAN"],
  [/\bAJA YE\b/g, "AJAYE"],
  [/\bAJIF A\b/g, "AJIFA"],
  [/\bMEDA YESE\b/g, "MEDAYESE"],
  [/\bFAMORI TADE\b/g, "FAMORITADE"],
];

function fixName(name) {
  let result = name;
  for (const [pattern, replacement] of FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

// ── Read & parse ──────────────────────────────────────────────────────────────
let raw;
try {
  raw = fs.readFileSync(INPUT_FILE, "utf8");
} catch (e) {
  console.error(`❌  Could not read "${INPUT_FILE}": ${e.message}`);
  process.exit(1);
}

const data = JSON.parse(raw);

// ── Process ───────────────────────────────────────────────────────────────────
let totalUnits = 0;
let totalNamesFixed = 0;
let totalDuplicatesRemoved = 0;

const cleaned = {};

for (const [lga, wards] of Object.entries(data)) {
  cleaned[lga] = {};

  for (const [ward, units] of Object.entries(wards)) {
    const seen = new Set();
    const cleanedUnits = [];

    for (const unit of units) {
      totalUnits++;
      const fixedName = fixName(unit.name);
      if (fixedName !== unit.name) totalNamesFixed++;

      if (seen.has(fixedName)) {
        totalDuplicatesRemoved++;
        console.log(`  [DUPLICATE] "${fixedName}"  ›  ${lga} / ${ward}`);
        continue;
      }

      seen.add(fixedName);
      cleanedUnits.push({ ...unit, name: fixedName });
    }

    cleaned[lga][ward] = cleanedUnits;
  }
}

// ── Write output ──────────────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2), "utf8");

console.log("\n──────────────────────────────────");
console.log(`✅  Done!`);
console.log(`   Total polling units processed : ${totalUnits}`);
console.log(`   Names fixed                   : ${totalNamesFixed}`);
console.log(`   Duplicates removed            : ${totalDuplicatesRemoved}`);
console.log(`   Output saved to               : ${OUTPUT_FILE}`);
console.log("──────────────────────────────────\n");
