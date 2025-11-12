import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const diagnosticGrid = require('../data/diagnostic_grid.json');

const PROFILING_RULES = {
    "Débutant": { min: 0, max: 25, level: 1 },
    "Émergent": { min: 26, max: 50, level: 2 },
    "Challenger": { min: 51, max: 75, level: 3 },
    "Leader": { min: 76, max: 100, level: 4 },
};

export function calculateDiagnosticResults(scores) {
    const dimensionScores = {
        "Stratégie": [], "Culture & Humain": [], "Relation Client": [],
        "Processus": [], "Technologie": [], "Sécurité": [],
    };
    const palierScores = {
        "Stratégie": { 1: 0, 2: 0, 3: 0, 4: 0 },
        "Culture & Humain": { 1: 0, 2: 0, 3: 0, 4: 0 },
        "Relation Client": { 1: 0, 2: 0, 3: 0, 4: 0 },
        "Processus": { 1: 0, 2: 0, 3: 0, 4: 0 },
        "Technologie": { 1: 0, 2: 0, 3: 0, 4: 0 },
        "Sécurité": { 1: 0, 2: 0, 3: 0, 4: 0 },
    };

    for (const [criterionId, evalResult] of Object.entries(scores)) {
        const info = diagnosticGrid[criterionId];
        if (!info) continue;
        const { dimension, palier } = info;
        const scoreValue = evalResult.score || 0;
        if (dimensionScores[dimension]) {
            dimensionScores[dimension].push(scoreValue);
            palierScores[dimension][palier] += scoreValue;
        }
    }

    const dimensionResults = {};
    let totalGlobalScore = 0;

    for (const dimName of Object.keys(dimensionScores)) {
        const totalDimScore = dimensionScores[dimName].reduce((sum, val) => sum + val, 0);
        const scorePercent = (totalDimScore / 36) * 100;
        dimensionResults[dimName] = {
            score_brut: totalDimScore,
            score_percent: Math.round(scorePercent * 100) / 100,
            paliers: palierScores[dimName],
        };
        totalGlobalScore += scorePercent;
    }

    const global_score = Math.round((totalGlobalScore / 6) * 100) / 100;

    let profile_info = { profile_name: "Indéfini", profile_level: 0 };
    if (global_score >= PROFILING_RULES["Leader"].min) {
        profile_info = { profile_name: "Leader", profile_level: PROFILING_RULES["Leader"].level };
    } else if (global_score >= PROFILING_RULES["Challenger"].min) {
        profile_info = { profile_name: "Challenger", profile_level: PROFILING_RULES["Challenger"].level };
    } else if (global_score >= PROFILING_RULES["Émergent"].min) {
        profile_info = { profile_name: "Émergent", profile_level: PROFILING_RULES["Émergent"].level };
    } else {
        profile_info = { profile_name: "Débutant", profile_level: PROFILING_RULES["Débutant"].level };
    }

    const target_palier_level = profile_info.profile_level;
    const digital_gaps = [];

    for (const [dimName, result] of Object.entries(dimensionResults)) {
        let achieved_level = 0;
        const PALIER_THRESHOLD = 4;
        if (result.paliers[1] > PALIER_THRESHOLD) {achieved_level = 1;
            if (result.paliers[2] > PALIER_THRESHOLD) {achieved_level = 2;
                if (result.paliers[3] > PALIER_THRESHOLD) {achieved_level = 3;
                    if (result.paliers[4] > PALIER_THRESHOLD) {achieved_level = 4;
                    }
                }
            }
        }
        result.palier_atteint = achieved_level;
        if (achieved_level < target_palier_level) {
            digital_gaps.push({
                dimension: dimName,
                palier_atteint: achieved_level,
                palier_cible: target_palier_level,
            });
        }
    }

    return {
        global_score,
        ...profile_info,
        digital_gaps,
        dimension_results: dimensionResults,
    };
}