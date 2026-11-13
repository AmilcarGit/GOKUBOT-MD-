const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const LEGACY_DATA_DIR = path.join(ROOT, 'goku', 'data');

// Migra los datos guardados en la ubicación anterior (goku/data) sin perder perfiles.
try {
  if (fs.existsSync(LEGACY_DATA_DIR) && !fs.existsSync(DATA_DIR)) {
    fs.renameSync(LEGACY_DATA_DIR, DATA_DIR);
    if (!fs.readdirSync(path.join(ROOT, 'goku')).length) fs.rmdirSync(path.join(ROOT, 'goku'));
  }
} catch (error) {
  console.error('No se pudo migrar goku/data a data/:', error.message);
}

module.exports = { ROOT, DATA_DIR };
