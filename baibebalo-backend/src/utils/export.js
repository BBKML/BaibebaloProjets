/**
 * Utilitaires pour l'export de données (CSV, Excel, PDF)
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const logger = require('./logger');

/**
 * Convertir des données en CSV
 */
function toCSV(data, headers) {
  if (!data || data.length === 0) {
    return '';
  }

  // Utiliser les headers fournis ou les clés du premier objet
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Créer la ligne d'en-tête
  const headerRow = csvHeaders.map(h => `"${h}"`).join(',');
  
  // Créer les lignes de données
  const rows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];
      // Échapper les guillemets et les virgules
      if (value === null || value === undefined) return '""';
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

/**
 * Convertir des données en format Excel (CSV avec BOM UTF-8)
 */
function toExcel(data, headers) {
  const csv = toCSV(data, headers);
  // Ajouter BOM UTF-8 pour Excel
  return '\ufeff' + csv;
}

/**
 * Convertir des données en PDF
 */
async function toPDF(data, headers, title = 'Export de données') {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    const fontSize = 10;
    const rowHeight = 20;
    let y = page.getHeight() - margin;
    
    // Titre
    page.drawText(title, {
      x: margin,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;
    
    // Ligne de séparation
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: page.getWidth() - margin, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 20;
    
    if (!data || data.length === 0) {
      page.drawText('Aucune donnée à exporter', {
        x: margin,
        y: y,
        size: fontSize,
        font: font,
      });
      return await pdfDoc.save();
    }
    
    // Headers
    const csvHeaders = headers || Object.keys(data[0]);
    const colWidth = (page.getWidth() - 2 * margin) / csvHeaders.length;
    
    csvHeaders.forEach((header, index) => {
      page.drawText(String(header), {
        x: margin + index * colWidth + 5,
        y: y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    });
    y -= rowHeight;
    
    // Données
    let currentPage = page;
    for (const row of data) {
      // Nouvelle page si nécessaire
      if (y < margin + rowHeight) {
        currentPage = pdfDoc.addPage([595, 842]);
        y = currentPage.getHeight() - margin;
      }
      
      csvHeaders.forEach((header, index) => {
        const value = row[header];
        const text = value !== null && value !== undefined ? String(value) : '';
        // Tronquer si trop long
        const displayText = text.length > 30 ? text.substring(0, 27) + '...' : text;
        
        currentPage.drawText(displayText, {
          x: margin + index * colWidth + 5,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
      y -= rowHeight;
    }
    
    return await pdfDoc.save();
  } catch (error) {
    logger.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}

/**
 * Exporter des commandes
 */
async function exportOrders(orders, format = 'csv') {
  if (!orders || orders.length === 0) {
    throw new Error('Aucune commande à exporter');
  }
  
  try {
    logger.info(`Exporting ${orders.length} orders in ${format} format`);
    
    // Préparer les données avec gestion des valeurs nulles
    const data = orders.map(order => {
      // Formater la date de manière sécurisée
      let formattedDate = '';
      if (order.placed_at) {
        try {
          const date = new Date(order.placed_at);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        } catch (e) {
          formattedDate = String(order.placed_at);
        }
      }
      
      return {
        'Numéro': String(order.order_number || order.id || 'N/A'),
        'Date': formattedDate,
        'Client': String(order.client_name || 'N/A'),
        'Restaurant': String(order.restaurant_name || 'N/A'),
        'Livreur': String(order.delivery_name || 'N/A'),
        'Sous-total': `${parseFloat(order.subtotal || 0).toFixed(2)} FCFA`,
        'Frais livraison': `${parseFloat(order.delivery_fee || 0).toFixed(2)} FCFA`,
        'Réduction': `${parseFloat(order.discount || 0).toFixed(2)} FCFA`,
        'Taxe': `${parseFloat(order.tax || 0).toFixed(2)} FCFA`,
        'Commission': `${parseFloat(order.commission || 0).toFixed(2)} FCFA`,
        'Total': `${parseFloat(order.total || 0).toFixed(2)} FCFA`,
        'Statut': String(order.status || 'N/A'),
        'Mode paiement': String(order.payment_method || 'N/A'),
        'Statut paiement': String(order.payment_status || 'N/A'),
      };
    });
    
    if (data.length === 0) {
      throw new Error('Aucune donnée à exporter après formatage');
    }
    
    const headers = Object.keys(data[0]);
    
    switch (format.toLowerCase()) {
      case 'csv':
        return {
          content: toCSV(data, headers),
          contentType: 'text/csv; charset=utf-8',
          filename: `commandes-${new Date().toISOString().split('T')[0]}.csv`,
        };
      
      case 'excel':
      case 'xlsx':
        return {
          content: toExcel(data, headers),
          contentType: 'text/csv; charset=utf-8',
          filename: `commandes-${new Date().toISOString().split('T')[0]}.csv`,
        };
      
      case 'pdf': {
        const pdfContent = await toPDF(data, headers, 'Export des Commandes');
        return {
          content: pdfContent,
          contentType: 'application/pdf',
          filename: `commandes-${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }
      
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  } catch (error) {
    logger.error('Erreur dans exportOrders:', error);
    throw error;
  }
}

module.exports = {
  toCSV,
  toExcel,
  toPDF,
  exportOrders,
};
