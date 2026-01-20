/**
 * Utilitaires pour l'export de données
 */

/**
 * Convertir des données en CSV
 */
export const toCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Si headers non fournis, utiliser les clés du premier objet
  const columns = headers || Object.keys(data[0]);
  
  // Créer la ligne d'en-tête
  const headerRow = columns.map(col => {
    const header = typeof col === 'string' ? col : col.label || col.key;
    return `"${header}"`;
  }).join(',');

  // Créer les lignes de données
  const dataRows = data.map(row => {
    return columns.map(col => {
      const key = typeof col === 'string' ? col : col.key;
      const value = row[key];
      // Échapper les guillemets et les virgules
      const escapedValue = String(value || '').replace(/"/g, '""');
      return `"${escapedValue}"`;
    }).join(',');
  });

  // Ajouter BOM UTF-8 pour Excel
  const BOM = '\uFEFF';
  return BOM + [headerRow, ...dataRows].join('\n');
};

/**
 * Télécharger un fichier
 */
export const downloadFile = (content, filename, mimeType = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Exporter des données en CSV
 */
export const exportToCSV = (data, filename, headers = null) => {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const csv = toCSV(data, headers);
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `export-${date}.csv`;
  downloadFile(csv, finalFilename);
};

/**
 * Exporter des données en JSON
 */
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const json = JSON.stringify(data, null, 2);
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `export-${date}.json`;
  downloadFile(json, finalFilename, 'application/json');
};
