#!/usr/bin/env node
/**
 * Génère un rapport de tests HTML (jest-html-reporter + résumé).
 * - Exécute tous les tests avec couverture
 * - Sauvegarde dans tests/reports/YYYY-MM-DD.html
 * - Optionnel : envoi par email (REPORT_SEND_EMAIL=1, REPORT_EMAIL_TO)
 * - PDF : ouvrir le HTML dans un navigateur et utiliser "Imprimer > Enregistrer en PDF"
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(__dirname, 'reports');

function getDateStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function parseJestOutput(stdout) {
  const stats = { total: 0, passed: 0, failed: 0, modules: {}, coveragePct: null };
  const testsLine = stdout.match(/Tests:[\s\S]*?(\d+)\s+failed[\s\S]*?(\d+)\s+passed[\s\S]*?(\d+)\s+total/);
  if (testsLine) {
    stats.failed = parseInt(testsLine[1], 10);
    stats.passed = parseInt(testsLine[2], 10);
    stats.total = parseInt(testsLine[3], 10);
  } else {
    const totalMatch = stdout.match(/(\d+)\s+total/);
    const passedMatch = stdout.match(/(\d+)\s+passed/);
    const failedMatch = stdout.match(/(\d+)\s+failed/);
    if (totalMatch) stats.total = parseInt(totalMatch[1], 10);
    if (passedMatch) stats.passed = parseInt(passedMatch[1], 10);
    if (failedMatch) stats.failed = parseInt(failedMatch[1], 10);
    else if (stats.total && stats.passed != null) stats.failed = stats.total - stats.passed;
  }
  const coverageMatch = stdout.match(/All files[\s\S]*?\|[^|]*\|\s*([\d.]+)/);
  if (coverageMatch) stats.coveragePct = Math.round(parseFloat(coverageMatch[1]));
  return stats;
}

function recommendations(stats) {
  const lines = [];
  const failed = stats.failed || 0;
  if (failed > 0) {
    lines.push(`• ${failed} test(s) en échec : vérifier les assertions et les mocks.`);
  }
  if (stats.coveragePct != null && stats.coveragePct < 50) {
    lines.push('• Couverture de code faible : viser au moins 50 % sur les lignes.');
  }
  if (lines.length === 0) lines.push('• Aucune recommandation particulière.');
  return lines;
}

function buildSummaryHtml(stats, durationMs, reportPath) {
  const total = stats.total || 0;
  const passed = stats.passed || 0;
  const failed = stats.failed || 0;
  const pct = total ? Math.round((passed / total) * 100) : 0;
  const modules = stats.modules || {};
  const recs = recommendations(stats);

  const coverageHtml = stats.coveragePct != null
    ? `
    <div class="card">
      <h3>Couverture</h3>
      <p>Lignes : <strong>${stats.coveragePct}%</strong></p>
    </div>`
    : '<div class="card"><h3>Couverture</h3><p>Voir rapport détaillé ci-dessous.</p></div>';

  const moduleRows = Object.keys(modules).length > 0
    ? Object.entries(modules)
        .map(
          ([name, s]) =>
            `<tr><td>${name}</td><td>${s.passed}</td><td>${s.failed}</td><td>${s.total}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4">Voir rapport détaillé ci-dessous pour le détail par fichier.</td></tr>';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Rapport BAIBEBALO - ${getDateStr()}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    h1 { color: #1a1a1a; }
    .cards { display: flex; flex-wrap: wrap; gap: 16px; margin: 20px 0; }
    .card { flex: 1; min-width: 140px; padding: 16px; background: #f9f9f9; border-radius: 8px; }
    .card h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; }
    .card p { margin: 4px 0; }
    .success { color: #0a0; }
    .fail { color: #c00; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; }
    .recs { background: #fff8e6; padding: 12px; border-radius: 8px; margin: 16px 0; }
    .recs ul { margin: 0; padding-left: 20px; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; }
    a { color: #06c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Rapport de tests BAIBEBALO</h1>
    <p><strong>Date :</strong> ${getDateStr()} &nbsp;|&nbsp; <strong>Fichier :</strong> <a href="${path.basename(reportPath)}">${path.basename(reportPath)}</a></p>

    <div class="cards">
      <div class="card">
        <h3>Total tests</h3>
        <p><strong>${total}</strong></p>
      </div>
      <div class="card">
        <h3>Taux de réussite</h3>
        <p class="${failed ? 'fail' : 'success'}"><strong>${pct}%</strong> (${passed} passés)</p>
      </div>
      <div class="card">
        <h3>Échecs</h3>
        <p class="${failed ? 'fail' : 'success'}"><strong>${failed}</strong></p>
      </div>
      <div class="card">
        <h3>Temps d'exécution</h3>
        <p><strong>${(durationMs / 1000).toFixed(2)} s</strong></p>
      </div>
      ${coverageHtml}
    </div>

    <h2>Tests par module</h2>
    <table>
      <thead><tr><th>Module</th><th>Passés</th><th>Échoués</th><th>Total</th></tr></thead>
      <tbody>${moduleRows}</tbody>
    </table>

    <h2>Recommandations</h2>
    <div class="recs"><ul>${recs.map((r) => `<li>${r}</li>`).join('')}</ul></div>

    <h2>Détail des tests</h2>
    <hr style="margin: 24px 0;">
    <h2>Détail des tests (jest-html-reporter)</h2>
    <p>Ci-dessous : rapport détaillé généré par jest-html-reporter.</p>
  </div>
  __REPORTER_BODY__
</body>
</html>`;
}

function runJestAndCollect(outputPath) {
  process.env.JEST_HTML_REPORTER_OUTPUT_PATH = outputPath.replace(/\\/g, '/');
  const jestConfigPath = path.join(ROOT, 'jest.config.js');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const jestBin = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');
    const child = spawn(
      process.execPath,
      [jestBin, '--coverage', '--config', jestConfigPath],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      const durationMs = Date.now() - start;
      const stats = parseJestOutput(stdout + stderr);
      resolve({ stats, durationMs, exitCode: code });
    });
    child.on('error', reject);
  });
}

async function sendEmailIfRequested(reportPath) {
  const send = process.env.REPORT_SEND_EMAIL === '1' || process.env.REPORT_SEND_EMAIL === 'true';
  const to = process.env.REPORT_EMAIL_TO;
  if (!send || !to) return;

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    const date = getDateStr();
    await transporter.sendMail({
      from: process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER || 'noreply@baibebalo.com',
      to: to.split(',').map((e) => e.trim()),
      subject: `[BAIBEBALO] Rapport de tests ${date}`,
      text: `Rapport du ${date}. Pièce jointe : ${path.basename(reportPath)}`,
      attachments: [{ filename: path.basename(reportPath), path: reportPath }],
    });
    console.log('Rapport envoyé par email à', to);
  } catch (err) {
    console.warn('Envoi email ignoré ou échoué:', err.message);
  }
}

async function main() {
  ensureReportsDir();
  const date = getDateStr();
  const reportPath = path.join(REPORTS_DIR, `${date}.html`);

  console.log('Exécution des tests avec couverture...');
  const { stats, durationMs } = await runJestAndCollect(reportPath);

  const numTotal = stats.total || 0;
  const numPassed = stats.passed || 0;
  const numFailed = stats.failed || 0;

  let finalHtml = buildSummaryHtml(stats, durationMs, reportPath);
  if (fs.existsSync(reportPath)) {
    const reporterContent = fs.readFileSync(reportPath, 'utf8');
    const bodyMatch = reporterContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const reporterBody = bodyMatch ? bodyMatch[1].trim() : reporterContent;
    finalHtml = finalHtml.replace('__REPORTER_BODY__', reporterBody);
  } else {
    finalHtml = finalHtml.replace('__REPORTER_BODY__', '<p>Rapport détaillé non généré.</p>');
  }
  fs.writeFileSync(reportPath, finalHtml.trim(), 'utf8');

  console.log('\n--- Résumé ---');
  console.log(`Total : ${numTotal} | Réussis : ${numPassed} | Échoués : ${numFailed}`);
  console.log(`Temps : ${(durationMs / 1000).toFixed(2)} s`);
  console.log(`Rapport : ${reportPath}`);

  await sendEmailIfRequested(reportPath);
  process.exit(numFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
