import { PDFService } from '../services/pdfService.js';
import { Conversation } from '../models/Conversation.js';

export const generatePDFReport = async (req, res) => {
    const { conversation_id } = req.params;
    const UserId = req.user.id;
    
    try {
        console.log(`[PDF Controller] Generating PDF for conversation: ${conversation_id}, UserId: ${UserId}`);
        
        // Get conversation
        const conversation = await Conversation.findOne({ conversation_id: conversation_id, UserId: UserId });
        if (!conversation) {
            console.log(`[PDF Controller] Conversation not found: ${conversation_id}`);
            return res.status(404).json({ detail: "Conversation not found." });
        }

        console.log(`[PDF Controller] Conversation found with ${conversation.history?.length || 0} history entries`);

        const scores_map = (conversation.history || []).reduce((acc, entry) => {
            if (entry.evaluation && entry.criterion_id) {
                acc[entry.criterion_id] = entry.evaluation;
            }
            return acc;
        }, {});

        console.log(`[PDF Controller] Built scores_map with ${Object.keys(scores_map).length} entries`);

        const { calculateDiagnosticResults } = await import('../services/scoringService.js');
        const resultsData = calculateDiagnosticResults(scores_map);
        
        console.log(`[PDF Controller] Calculated results: global_score=${resultsData.global_score}, profile=${resultsData.profile_name}`);
        
        // Generate PDF
        console.log('[PDF Controller] Starting PDF generation...');
        const pdfBuffer = await PDFService.generateDiagnosticReport(resultsData, conversation);
        
        if (!pdfBuffer || pdfBuffer.length === 0) {
            console.error('[PDF Controller] PDF buffer is empty!');
            return res.status(500).json({ 
                detail: 'Failed to generate PDF report: Empty PDF buffer',
            });
        }
        
        console.log(`[PDF Controller] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
        
        // Verify PDF buffer is valid (should start with %PDF)
        if (pdfBuffer.length > 0) {
          // Check if it's a Buffer or Uint8Array
          const firstBytes = Buffer.isBuffer(pdfBuffer) 
            ? pdfBuffer.slice(0, 4) 
            : Buffer.from(pdfBuffer).slice(0, 4);
          const pdfHeader = firstBytes.toString('utf8');
          
          if (pdfHeader !== '%PDF') {
            console.error(`[PDF Controller] Invalid PDF header: ${pdfHeader} (hex: ${firstBytes.toString('hex')})`);
            // Don't fail - just log the warning, PDF might still be valid
            console.warn('[PDF Controller] PDF header check failed, but continuing...');
          } else {
            console.log(`[PDF Controller] PDF header verified: ${pdfHeader}`);
          }
        }
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="DigiAssistant_Report_${conversation_id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Send PDF buffer as binary
        res.end(pdfBuffer, 'binary');
        
    } catch (error) {
        console.error('[PDF Controller] Error generating PDF:', error);
        console.error('[PDF Controller] Error stack:', error.stack);
        res.status(500).json({ 
            detail: 'Failed to generate PDF report',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getStructuredResults = async (req, res) => {
    const { conversation_id } = req.params;
    const UserId = req.user.id;
    
    try {
        console.log(`[Structured Results] Fetching results for conversation: ${conversation_id}, UserId: ${UserId}`);
        
        const conversation = await Conversation.findOne({ conversation_id: conversation_id, UserId: UserId });
        if (!conversation) {
            console.log(`[Structured Results] Conversation not found: ${conversation_id}`);
            return res.status(404).json({ detail: "Conversation not found or access denied." });
        }
        
        if (!conversation.history || conversation.history.length === 0) {
            console.log(`[Structured Results] Conversation has no history: ${conversation_id}`);
            return res.status(404).json({ detail: "Conversation has no history." });
        }

        console.log(`[Structured Results] Conversation found with ${conversation.history.length} history entries`);

        // Build detailed results structure
        const scores_map = conversation.history.reduce((acc, entry) => {
            if (entry.evaluation && entry.criterion_id) {
                acc[entry.criterion_id] = entry.evaluation;
            }
            return acc;
        }, {});

        console.log(`[Structured Results] Built scores_map with ${Object.keys(scores_map).length} entries`);

        const { calculateDiagnosticResults } = await import('../services/scoringService.js');
        const diagnosticResults = calculateDiagnosticResults(scores_map);
        
        console.log(`[Structured Results] Calculated diagnostic results:`, {
            global_score: diagnosticResults.global_score,
            profile_name: diagnosticResults.profile_name,
            profile_level: diagnosticResults.profile_level,
            dimensions_count: Object.keys(diagnosticResults.dimension_results).length,
            gaps_count: diagnosticResults.digital_gaps?.length || 0
        });
        
        // Enhanced structured response - matching frontend expectations
        const structuredResults = {
            conversation_id,
            generated_at: new Date().toISOString(),
            status: conversation.status || 'completed',
            // Main fields expected by frontend
            global_score: diagnosticResults.global_score,
            profile_name: diagnosticResults.profile_name,
            profile_level: diagnosticResults.profile_level,
            // Dimension results as object (frontend expects dimension_results)
            dimension_results: Object.fromEntries(
                Object.entries(diagnosticResults.dimension_results).map(([name, data]) => [
                    name,
                    {
                        score_percent: data.score_percent,
                        palier_atteint: data.palier_atteint,
                        paliers: data.paliers
                    }
                ])
            ),
            // Also include dimensions array for detailed view
            dimensions: Object.entries(diagnosticResults.dimension_results).map(([name, data]) => ({
                name,
                score_percent: data.score_percent,
                score_raw: data.score_brut,
                achieved_level: data.palier_atteint,
                palier_breakdown: data.paliers
            })),
            digital_gaps: diagnosticResults.digital_gaps || [],
            detailed_responses: conversation.history.map(entry => ({
                criterion_id: entry.criterion_id,
                user_answer: entry.user_answer,
                evaluation: entry.evaluation,
                ai_reaction: entry.ai_reaction,
                ai_question: entry.ai_question || null
            })),
            recommendations: generateRecommendations(diagnosticResults),
            // Summary for additional info
            summary: {
                global_score: diagnosticResults.global_score,
                profile: {
                    name: diagnosticResults.profile_name,
                    level: diagnosticResults.profile_level
                },
                total_questions_answered: conversation.history.length,
                completion_percentage: Math.round((conversation.history.length / 72) * 100)
            }
        };
        
        res.json(structuredResults);
        
    } catch (error) {
        console.error('[Structured Results] Error:', error);
        res.status(500).json({ 
            detail: 'Failed to generate structured results',
            error: error.message 
        });
    }
};

function generateRecommendations(results) {
    const recommendations = [];
    const { global_score, digital_gaps, dimension_results } = results;
    
    // Global recommendations based on score
    if (global_score < 30) {
        recommendations.push({
            type: 'global',
            priority: 'high',
            title: 'Foundation Building',
            description: 'Focus on establishing basic digital infrastructure and processes before advancing to higher levels.'
        });
    } else if (global_score < 60) {
        recommendations.push({
            type: 'global',
            priority: 'medium',
            title: 'Strategic Development',
            description: 'Develop a comprehensive digital strategy and invest in advanced technologies.'
        });
    } else {
        recommendations.push({
            type: 'global',
            priority: 'low',
            title: 'Optimization',
            description: 'Focus on optimizing existing digital processes and exploring emerging technologies.'
        });
    }
    
    // Dimension-specific recommendations
    digital_gaps.forEach(gap => {
        const dimension = dimension_results[gap.dimension];
        recommendations.push({
            type: 'dimension',
            priority: 'high',
            dimension: gap.dimension,
            title: `Improve ${gap.dimension}`,
            description: `Current level ${gap.palier_atteint} needs to reach level ${gap.palier_cible}. Focus on palier-specific improvements.`,
            current_score: dimension.score_percent
        });
    });
    
    return recommendations;
}
