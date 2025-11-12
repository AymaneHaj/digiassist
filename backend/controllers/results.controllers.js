import { Conversation } from '../models/Conversation.js';
import { calculateDiagnosticResults } from '../services/scoringService.js';

export const getResults = async (req, res) => {
    const { conversation_id } = req.params;
    const UserId = req.user.id;

    try {
        const conversation = await Conversation.findOne({
            conversation_id: conversation_id,
            UserId: UserId
        });

        if (!conversation) {
            return res.status(404).json({ detail: "Conversation not found or access denied." });
        }

        const scores_map = (conversation.history || []).reduce((acc, entry) => {
            if (entry.evaluation) acc[entry.criterion_id] = entry.evaluation;
            return acc;
        }, {});

        console.log(`[Node.js Results] Calculating report for ${conversation_id} with ${Object.keys(scores_map).length} scores.`);

        const finalReport = calculateDiagnosticResults(scores_map);

        return res.json({
            conversation_id,
            ...finalReport
        });

    } catch (error) {
        console.error(`[Node.js Results] Error for ${conversation_id}:`, error.message);
        res.status(500).json({ detail: 'Internal Server Error in Node.js results' });
    }
};