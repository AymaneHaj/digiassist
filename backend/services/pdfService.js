import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Setup ---
import diagnosticGrid from '../data/diagnostic_grid.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIMENSION_ORDER = [
  "Stratégie",
  "Culture & Humain",
  "Relation Client",
  "Processus",
  "Technologie",
  "Sécurité"
];


export class PDFService {

  /**
   * Main public method.
   */
  static async generateDiagnosticReport(resultsData, conversation) {
    let browser;
    try {
      console.log('[PDF Service] Launching Puppeteer...');

      // Launch browser with better error handling
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        timeout: 30000 // 30 seconds timeout
      });

      console.log('[PDF Service] Browser launched successfully');

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1200, height: 800 });

      console.log('[PDF Service] Generating HTML content...');
      const htmlContent = this.generateReportHTML(resultsData, conversation);

      if (!htmlContent || htmlContent.length === 0) {
        throw new Error('HTML content is empty');
      }

      console.log(`[PDF Service] HTML content generated, length: ${htmlContent.length} characters`);

      console.log('[PDF Service] Setting page content...');
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('[PDF Service] Page content set successfully');

      console.log('[PDF Service] Generating PDF buffer...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '25mm',
          right: '15mm',
          bottom: '25mm',
          left: '15mm'
        },
        timeout: 30000
      });

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }

      console.log(`[PDF Service] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;

    } catch (error) {
      console.error('[PDF Service] Error generating PDF:', error);
      console.error('[PDF Service] Error stack:', error.stack);
      throw new Error(`PDF Generation Error: ${error.message}`);
    } finally {
      if (browser) {
        try {
          console.log('[PDF Service] Closing Puppeteer browser.');
          await browser.close();
        } catch (closeError) {
          console.error('[PDF Service] Error closing browser:', closeError);
        }
      }
    }
  }

  /**
   * The HTML Assembler.
   */
  static generateReportHTML(resultsData, conversation) {
    const { conversation_id, history } = conversation;
    const generatedDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const summaryHtml = this.generateSummaryHTML(resultsData);

    const analysisHtml = this.generateAnalysisHTML(resultsData);

    const tableHtml = this.generateDetailedTableHTML(history, resultsData);

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport de Maturité Digitale</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 90%;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #008C9E;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #008C9E;
      margin: 0;
      font-size: 2.2em;
    }
    .header p { color: #666; margin: 5px 0 0 0; }
    .page-break { page-break-after: always; }
    
    .summary-box {
      background: linear-gradient(135deg, #008C9E, #006b7a);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      margin: 30px 0;
    }
    .summary-global-score { font-size: 3.5em; font-weight: bold; margin: 0; }
    .summary-profile { font-size: 1.6em; margin: 10px 0; opacity: 0.9; }
    
    .analysis-box { margin-bottom: 30px; }
    .analysis-gaps {
      background: #fff5f5;
      border-left: 5px solid #dc3545;
      padding: 15px 20px;
      border-radius: 5px;
    }
    .analysis-strengths {
      background: #f8fff8;
      border-left: 5px solid #28a745;
      padding: 15px 20px;
      border-radius: 5px;
      margin-top: 15px;
    }
    .analysis-box h2 { color: #333; margin-top: 0; }
    .analysis-box ul { padding-left: 20px; margin: 0; }
    .analysis-box li { margin-bottom: 8px; }
    
    .detailed-table {
      margin: 30px 0;
    }
    .detailed-table h2 {
      border-bottom: 3px solid #008C9E;
      padding-bottom: 15px;
      margin-bottom: 25px;
      color: #008C9E;
      font-size: 1.8em;
    }
    
    .main-header-table,
    .main-table,
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 2px solid #333;
      font-size: 0.9em;
    }
    
    .main-header-table th,
    .main-header-table td,
    .main-table th,
    .main-table td,
    .footer-table th,
    .footer-table td {
      border: 1px solid #333;
      padding: 8px;
    }
    
    .main-header-table th,
    .footer-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    
    .main-table thead th {
      background-color: #008C9E;
      color: white;
      font-weight: bold;
      text-align: center;
    }
    
    .main-table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      color: #888;
      font-size: 0.8em;
    }
    
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rapport de Maturité Digitale</h1>
      <p>Conversation ID: ${conversation_id}</p>
      <p>Rapport généré le: ${generatedDate}</p>
    </div>
    
        ${summaryHtml}
    
        ${analysisHtml}
    
        <div class="page-break"></div>
    
        ${tableHtml}
    
    <div class="footer">
      <p>Rapport généré par DigiAssistant</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  
  static generateSummaryHTML(resultsData) {
    const { global_score, profile_name, profile_level, dimension_results } = resultsData;

    // Table with dimensions and scores
    let dimensionsTableRows = '';
    for (const dimName of DIMENSION_ORDER) {
      const data = dimension_results[dimName];
      if (data) {
        // Calculate scores for each palier (P1, P2, P3, P4)
        const palier1Score = data.paliers[1] || 0;
        const palier2Score = data.paliers[2] || 0;
        const palier3Score = data.paliers[3] || 0;
        const palier4Score = data.paliers[4] || 0;
        const totalScore = palier1Score + palier2Score + palier3Score + palier4Score;

        dimensionsTableRows += `
          <tr style="background-color: ${data.score_percent < 50 ? '#fff5f5' : '#f9f9f9'};">
            <td style="border: 1px solid #333; padding: 8px; font-weight: bold;">${dimName}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center;">${palier1Score}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center;">${palier2Score}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center;">${palier3Score}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center;">${palier4Score}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">${totalScore}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; background-color: ${data.score_percent < 50 ? '#ffcccc' : 'transparent'};">
              ${data.score_percent.toFixed(1)}%
            </td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Palier ${data.palier_atteint}</td>
          </tr>
        `;
      }
    }

    return `
    <div class="summary-section">
      <h2 style="text-align: center; color: #008C9E; margin-bottom: 20px; font-size: 1.8em;">
        Rapport de Maturité Digitale
      </h2>
      
      <table class="dimensions-summary-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #333;">
        <thead>
          <tr style="background-color: #008C9E; color: white;">
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Dimension</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Palier 1</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Palier 2</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Palier 3</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Palier 4</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Total</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Score %</th>
            <th style="border: 1px solid #333; padding: 10px; text-align: center;">Palier Atteint</th>
          </tr>
        </thead>
        <tbody>
          ${dimensionsTableRows}
        </tbody>
      </table>
      
      <div class="global-score-box" style="background: linear-gradient(135deg, #008C9E, #006b7a); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 10px;">${global_score.toFixed(1)}%</div>
        <div style="font-size: 1.4em; opacity: 0.9;">Profil: ${profile_name} (Niveau ${profile_level})</div>
        <div style="font-size: 1.1em; margin-top: 10px; opacity: 0.8;">Paliers cibles attendus : Palier ${profile_level}</div>
      </div>
    </div>
    `;
  }

  static generateAnalysisHTML(resultsData) {
    const { digital_gaps, profile_level, dimension_results } = resultsData;
    const target_level = profile_level;

    // Digital gaps (dimensions < target level)
    let gapsHtml = '<h3 style="color: #dc3545; margin-top: 0;">🚨 Digital gaps identifiés (dimensions < Palier ${target_level}):</h3>';
    if (digital_gaps.length > 0) {
      gapsHtml += '<ul style="padding-left: 20px;">';
      for (const gap of digital_gaps) {
        const gapText = gap.palier_atteint < target_level - 1
          ? `${gap.dimension} (Palier ${gap.palier_atteint} → à renforcer fortement)`
          : `${gap.dimension} (Palier ${gap.palier_atteint} → à faire progresser)`;
        gapsHtml += `<li style="margin-bottom: 8px;"><b>${gapText}</b></li>`;
      }
      gapsHtml += '</ul>';
    } else {
      gapsHtml += '<p>Félicitations! Aucune lacune majeure identifiée par rapport à votre profil.</p>';
    }

    // Dimensions aligned with target level
    const alignedDimensions = [];
    for (const dimName of DIMENSION_ORDER) {
      const data = dimension_results[dimName];
      if (data && data.palier_atteint === target_level) {
        alignedDimensions.push(dimName);
      }
    }

    let alignedHtml = '<h3 style="color: #28a745; margin-top: 20px;">✅ Dimensions alignées au palier cible:</h3>';
    if (alignedDimensions.length > 0) {
      alignedHtml += '<ul style="padding-left: 20px;">';
      alignedHtml += `<li style="margin-bottom: 8px;"><b>${alignedDimensions.join(', ')}</b></li>`;
      alignedHtml += '</ul>';
    } else {
      alignedHtml += '<p>Aucune dimension n\'est exactement alignée avec le niveau cible.</p>';
    }

    // Dimensions exceeding target level
    const exceedingDimensions = [];
    for (const dimName of DIMENSION_ORDER) {
      const data = dimension_results[dimName];
      if (data && data.palier_atteint > target_level) {
        exceedingDimensions.push({ name: dimName, level: data.palier_atteint });
      }
    }

    let exceedingHtml = '<h3 style="color: #008C9E; margin-top: 20px;">🌟 Dimension dépassant le palier cible:</h3>';
    if (exceedingDimensions.length > 0) {
      exceedingHtml += '<ul style="padding-left: 20px;">';
      for (const dim of exceedingDimensions) {
        exceedingHtml += `<li style="margin-bottom: 8px;"><b>${dim.name} (Palier ${dim.level}) – opportunité de capitalisation</b></li>`;
      }
      exceedingHtml += '</ul>';
    } else {
      exceedingHtml += '<p>Aucune dimension ne dépasse actuellement le niveau cible.</p>';
    }

    return `
    <div class="analysis-box" style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 30px; border-left: 5px solid #008C9E;">
      <h2 style="color: #333; margin-top: 0; border-bottom: 2px solid #008C9E; padding-bottom: 10px;">Analyse des digital gaps</h2>
      <div class="analysis-gaps" style="margin-bottom: 20px;">
        ${gapsHtml}
      </div>
      <div class="analysis-aligned" style="margin-bottom: 20px;">
        ${alignedHtml}
      </div>
      <div class="analysis-exceeding">
        ${exceedingHtml}
      </div>
    </div>
    `;
  }

  static generateDetailedTableHTML(history, resultsData) {
    const scoresMap = new Map();
    for (const entry of history) {
      if (entry.evaluation && entry.criterion_id) {
        scoresMap.set(entry.criterion_id, entry.evaluation.score);
      }
    }

    const { global_score, profile_level, dimension_results } = resultsData;
    const targetPalier = profile_level;

    let allTablesHtml = `
    <div class="detailed-table">
      <h2>Rapport Détaillé de Maturité Digitale</h2>
      
      <!-- Header Table -->
      <table class="main-header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #333;">
        <tr style="background-color: #f0f0f0;">
          <th style="border: 1px solid #333; padding: 10px; text-align: center; width: 50%;">Score initial de maturité globale %</th>
          <th style="border: 1px solid #333; padding: 10px; text-align: center; width: 50%;">Niveau initial de maturité globale</th>
        </tr>
        <tr>
          <td style="border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; font-size: 1.2em;">${global_score.toFixed(2)}%</td>
          <td style="border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; font-size: 1.2em;">${profile_level} - ${resultsData.profile_name}</td>
        </tr>
      </table>
      
      <!-- Main Table Header -->
      <table class="main-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #333;">
        <thead>
          <tr style="background-color: #008C9E; color: white;">
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 15%;">Dimension</th>
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 10%;">Palier cible</th>
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 25%;">Critère 1</th>
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 25%;">Critère 2</th>
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 25%;">Critère 3</th>
            <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 15%;">Score de la dimension %</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const dimName of DIMENSION_ORDER) {
      const dimData = dimension_results[dimName];
      if (!dimData) continue;

      const criteriaByPalier = {};
      for (const [criterionId, data] of Object.entries(diagnosticGrid)) {
        if (data.dimension === dimName) {
          if (!criteriaByPalier[data.palier]) {
            criteriaByPalier[data.palier] = [];
          }
          criteriaByPalier[data.palier].push({ id: criterionId, ...data });
        }
      }

      let rowspan = 0;
      for (let palier = 1; palier <= 4; palier++) {
        const criteria = criteriaByPalier[palier] || [];
        if (criteria.length === 0) continue;
        rowspan += 3; 
      }

      const palier1Criteria = criteriaByPalier[1] || [];
      if (palier1Criteria.length > 0) {
        allTablesHtml += `
          <tr style="background-color: #e6f7ff;">
            <td rowspan="${rowspan}" style="border: 1px solid #333; padding: 8px; font-weight: bold; vertical-align: middle; text-align: center; font-size: 1.1em;">${dimName}</td>
            <td rowspan="${rowspan}" style="border: 1px solid #333; padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 1.1em;">Niveau ${targetPalier}</td>
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${palier1Criteria[0]?.criterion_text || ''}</td>
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${palier1Criteria[1]?.criterion_text || ''}</td>
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${palier1Criteria[2]?.criterion_text || ''}</td>
            <td rowspan="${rowspan}" style="border: 1px solid #333; padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 1.2em;">${dimData.score_percent.toFixed(2)}%</td>
          </tr>
          <tr style="background-color: #e6f7ff;">
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
          </tr>
          <tr style="background-color: #e6f7ff;">
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(palier1Criteria[0]?.id) ?? 0}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(palier1Criteria[1]?.id) ?? 0}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(palier1Criteria[2]?.id) ?? 0}</td>
          </tr>
        `;
      }

      // Palier 2, 3, 4
      for (let palier = 2; palier <= 4; palier++) {
        const criteria = criteriaByPalier[palier] || [];
        if (criteria.length === 0) continue;

        const bgColor = palier === 2 ? '#fffbe6' : palier === 3 ? '#fff0e6' : '#e6ffed';

        allTablesHtml += `
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${criteria[0]?.criterion_text || ''}</td>
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${criteria[1]?.criterion_text || ''}</td>
            <td style="border: 1px solid #333; padding: 8px; font-size: 0.85em;">${criteria[2]?.criterion_text || ''}</td>
          </tr>
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold;">Score Critère</td>
          </tr>
          <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(criteria[0]?.id) ?? 0}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(criteria[1]?.id) ?? 0}</td>
            <td style="border: 1px solid #333; padding: 8px; text-align: center; font-weight: bold; font-size: 1.1em;">${scoresMap.get(criteria[2]?.id) ?? 0}</td>
          </tr>
        `;
      }
    }

    allTablesHtml += `
        </tbody>
      </table>
      
      <!-- Footer Table -->
      <table class="footer-table" style="width: 100%; border-collapse: collapse; margin-top: 30px; border: 2px solid #333;">
        <tr style="background-color: #f0f0f0;">
          <th style="border: 1px solid #333; padding: 10px; text-align: center; width: 50%;">Score Final de maturité globale %</th>
          <th style="border: 1px solid #333; padding: 10px; text-align: center; width: 50%;">Niveau Final de maturité globale</th>
        </tr>
        <tr>
          <td style="border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; font-size: 1.2em;">${global_score.toFixed(2)}%</td>
          <td style="border: 1px solid #333; padding: 10px; text-align: center; font-weight: bold; font-size: 1.2em;">${profile_level} - ${resultsData.profile_name}</td>
        </tr>
      </table>
    </div>
    `;

    return allTablesHtml;
  }
}