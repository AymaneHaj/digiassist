// backend/controllers/chat.controllers.js
import axios from 'axios';
import 'dotenv/config';
import { Conversation } from '../models/Conversation.js';
import diagnosticGrid from '../data/diagnostic_grid.json' with { type: 'json' };


const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8000';
const ALL_CRITERIA_IDS = Object.keys(diagnosticGrid);

// Log AI Agent URL for debugging
if (!process.env.AI_AGENT_URL) {
  console.warn('[Node Backend] AI_AGENT_URL not set in .env, using default: http://localhost:8000');
}
console.log(`[Node Backend] AI Agent URL: ${AI_AGENT_URL}`);

// --- Helper Functions Implementation ---
function getCriterionById(criterionId) {
  if (!criterionId || !diagnosticGrid[criterionId]) {
    console.error(`[Node Backend] Criterion not found for ID: ${criterionId}`);
    return null;
  }
  return {
    id: criterionId,
    ...diagnosticGrid[criterionId]
  };
}

function getNextJumpIndex(currentIndex) {
  // Skip to next dimension's Palier 1
  const currentId = ALL_CRITERIA_IDS[currentIndex];
  const currentDimNumber = parseInt(currentId.match(/D(\d+)/)?.[1] || '0');
  const nextDimNumber = currentDimNumber + 1;

  // Find next dimension's first Palier 1 criterion
  const nextDimIndex = ALL_CRITERIA_IDS.findIndex(id =>
    id.includes(`D${nextDimNumber}`) && id.includes('P1-C1')
  );

  return nextDimIndex !== -1 ? nextDimIndex : null;
}



export const getActiveConversation = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ detail: "User authentication required." });
  }

  try {
    const conversation = await Conversation.findOne({
      UserId: req.user.id,
      status: 'in_progress' 
    }).sort({ updatedAt: -1 }); 

    if (!conversation) {
      return res.status(404).json({ detail: "No active conversation found." });
    }

    // Check if we need to generate or retrieve the current question
    // This happens when:
    // 1. The last entry has user_answer (real answer, not __PENDING__) but no ai_question (user answered, but next question not generated yet)
    // 2. OR the last entry has ai_question but user_answer is __PENDING__ (question exists, waiting for answer)
    // 3. OR history is empty (first question)
    const history = conversation.history || [];
    const lastEntry = history[history.length - 1];
    const currentIndex = conversation.current_index;
    
    // Case 1: Last entry has real user_answer but no ai_question (user answered previous question, need next question)
    const lastEntryNeedsQuestion = lastEntry && 
                                   lastEntry.user_answer && 
                                   lastEntry.user_answer !== '__PENDING__' && 
                                   !lastEntry.ai_question;
    
    // Case 2: Last entry has ai_question but user hasn't answered yet (question exists, waiting for answer)
    const lastEntryHasQuestionButNoAnswer = lastEntry && 
                                            lastEntry.ai_question && 
                                            lastEntry.user_answer === '__PENDING__';
    
    // Log the state for debugging
    console.log(`[Node Backend] getActiveConversation - State check:`, {
      historyLength: history.length,
      currentIndex,
      lastEntryExists: !!lastEntry,
      lastEntryNeedsQuestion,
      lastEntryHasQuestionButNoAnswer,
      lastEntryState: lastEntry ? {
        hasAiQuestion: !!lastEntry.ai_question,
        hasUserAnswer: !!lastEntry.user_answer,
        userAnswerIsPending: lastEntry.user_answer === '__PENDING__',
        userAnswer: lastEntry.user_answer ? lastEntry.user_answer.substring(0, 30) + '...' : 'none'
      } : null
    });
    
    // Case 3: Need to generate question for current_index
    // - History is empty (first question)
    // - OR last entry has real answer but no next question (lastEntryNeedsQuestion)
    // - OR last entry has both ai_question and real user_answer, but current_index points to a new criterion
    //   (user answered previous question, need next question for current_index)
    // - OR we need a new entry for current_index (last entry was answered, need next question)
    
    // Check if current_index corresponds to a criterion that's not yet in history
    // This happens when user answered all previous questions and we need the next one
    const lastEntryAnswered = lastEntry && 
                             lastEntry.user_answer && 
                             lastEntry.user_answer !== '__PENDING__' && 
                             lastEntry.ai_question;
    
    // Count how many entries we have (each entry is one question-answer pair)
    // If current_index is greater than the number of entries, we need a new question
    const needsNextQuestion = currentIndex >= history.length && currentIndex < ALL_CRITERIA_IDS.length;
    
    const needsCurrentQuestion = currentIndex < ALL_CRITERIA_IDS.length && 
                                 (history.length === 0 || 
                                  lastEntryNeedsQuestion ||
                                  needsNextQuestion ||
                                  (lastEntryAnswered && !lastEntryHasQuestionButNoAnswer));
    
    console.log(`[Node Backend] needsCurrentQuestion: ${needsCurrentQuestion}`, {
      needsNextQuestion,
      lastEntryAnswered,
      currentIndex,
      historyLength: history.length
    });

    if (needsCurrentQuestion) {
      // Get the current criterion based on current_index
      const currentCriterionId = ALL_CRITERIA_IDS[currentIndex];
      const currentCriterion = getCriterionById(currentCriterionId);

      if (!currentCriterion) {
        console.error(`[Node Backend] Error: Criterion not found for index ${currentIndex}`);
        return res.status(500).json({ detail: 'Internal error: Current criterion not found.' });
      }

      // Generate the question for current_index
      let ai_question;
      try {
        console.log(`[Node Backend] Generating question for resume at index ${currentIndex}: ${currentCriterion.id}`);
        // Only send is_first_question: true if this is truly the first question (index 0 and no history)
        const isFirstQuestion = currentIndex === 0 && history.length === 0;
        const formulateResponse = await axios.post(`${AI_AGENT_URL}/api/v1/formulate_question`, {
          criterion_text: currentCriterion.criterion_text,
          is_first_question: isFirstQuestion  // Only true for the very first question
        });
        ai_question = formulateResponse.data?.formulated_question;
        
        if (lastEntryNeedsQuestion) {
          // Case: Last entry has real user_answer but no ai_question
          // This means user answered the previous question, and we need to add a NEW entry for the next question
          // Don't update the last entry - add a new one for the next question
          conversation.history.push({
            criterion_id: currentCriterionId,
            user_answer: '__PENDING__', // Placeholder - will be replaced when user answers
            evaluation: { score: 0, justification: '' },
            ai_reaction: '',
            ai_question: ai_question
          });
          console.log(`[Node Backend] Added new question entry after user answered previous question for criterion ${currentCriterionId}`);
        } else if (history.length === 0) {
          // Case: First question - history is empty
          // Add a new entry with just the ai_question
          conversation.history.push({
            criterion_id: currentCriterionId,
            user_answer: '__PENDING__', // Placeholder - will be replaced when user answers
            evaluation: { score: 0, justification: '' },
            ai_reaction: '',
            ai_question: ai_question
          });
          console.log(`[Node Backend] Added first question for criterion ${currentCriterionId}`);
        } else if (lastEntryHasQuestionButNoAnswer) {
          // Case: Question already exists and waiting for answer
          // Make sure the question is set in the last entry (in case it was missing)
          if (!lastEntry.ai_question) {
            lastEntry.ai_question = ai_question;
            console.log(`[Node Backend] Added missing question to existing entry for current index ${currentIndex}`);
          } else {
            console.log(`[Node Backend] Question already exists for current index ${currentIndex}`);
          }
        } else {
          // Case: Need to add a new entry for the next question
          // This happens when the last entry was answered and we need the next question
          conversation.history.push({
            criterion_id: currentCriterionId,
            user_answer: '__PENDING__', // Placeholder - will be replaced when user answers
            evaluation: { score: 0, justification: '' },
            ai_reaction: '',
            ai_question: ai_question
          });
          console.log(`[Node Backend] Added new question entry for criterion ${currentCriterionId}`);
        }
        
        await conversation.save();
        console.log(`[Node Backend] Added question to conversation ${conversation.conversation_id} at index ${currentIndex}`);
      } catch (aiError) {
        console.error('[Node Backend] AI Agent failed to formulate question on resume:', aiError.response?.data || aiError.message);
        
        // Check if it's a rate limit error
        const errorMessage = aiError.response?.data?.detail || aiError.message || '';
        const isRateLimit = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit');
        
        if (isRateLimit) {
          // Use a fallback question
          ai_question = `Pouvez-vous me parler de: ${currentCriterion.criterion_text}?`;
          console.warn('[Node Backend] Rate limit detected, using fallback question');
          
          // Add the fallback question to history
          if (lastEntryNeedsQuestion) {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          } else if (history.length === 0) {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          } else if (lastEntryHasQuestionButNoAnswer) {
            // Update existing entry with fallback question if it's missing
            if (!lastEntry.ai_question) {
              lastEntry.ai_question = ai_question;
            }
          } else {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          }
          await conversation.save();
        } else {
          // If it's not a rate limit, try to use a simple fallback question
          ai_question = `Pouvez-vous me parler de: ${currentCriterion.criterion_text}?`;
          console.warn('[Node Backend] AI Agent error (non-rate-limit), using fallback question');
          
          if (lastEntryNeedsQuestion) {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          } else if (history.length === 0) {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          } else if (lastEntryHasQuestionButNoAnswer) {
            // Update existing entry with fallback question if it's missing
            if (!lastEntry.ai_question) {
              lastEntry.ai_question = ai_question;
            }
          } else {
            conversation.history.push({
              criterion_id: currentCriterionId,
              user_answer: '__PENDING__',
              evaluation: { score: 0, justification: '' },
              ai_reaction: '',
              ai_question: ai_question
            });
          }
          await conversation.save();
        }
      }
    }

    return res.json({
      conversation_id: conversation.conversation_id,
      history: conversation.history,
      current_index: conversation.current_index
    });

  } catch (error) {
    console.error('[Node Backend] Error in getActiveConversation:', error);
    res.status(500).json({ detail: "Internal Server Error" });
  }
};

// --- Main Chat Handler (new version) ---
export const handleChat = async (req, res) => {
  const { conversation_id, user_answer } = req.body;
  if (!conversation_id) {
    return res.status(400).json({ detail: "conversation_id is required." });
  }

  // Add check for user authentication
  if (!req.user || !req.user.id) {
    return res.status(401).json({ detail: "User authentication required." });
  }

  try {
    let conversation = await Conversation.findOne({ conversation_id: conversation_id, UserId: req.user.id });

    // --- Case 1: New Conversation ---
    if (!conversation) {
      console.log(`[Node Backend] New conversation: ${conversation_id}`);
      const firstCriterionId = ALL_CRITERIA_IDS[0];
      const firstCriterion = getCriterionById(firstCriterionId);

      // Update the safety check for firstCriterion
      if (!firstCriterion) {
        console.error('[Node Backend] Failed to get first criterion:', firstCriterionId);
        return res.status(500).json({
          detail: 'Failed to initialize conversation: Diagnostic criteria not found'
        });
      }

      // Default fallback question for first question
      let ai_question = `Bienvenue sur DigiAssistant ! 👋 Je suis votre assistant intelligent pour évaluer la maturité digitale de votre entreprise. À travers des questions interactives, je vais vous guider étape par étape pour vous aider à comprendre et améliorer votre transformation numérique. Prêt(e) à commencer votre parcours digital ? 🚀\n\nPensez-vous que le digital est essentiel pour l'avenir de votre entreprise ?`;
      
      try {
        const formulateResponse = await axios.post(`${AI_AGENT_URL}/api/v1/formulate_question`, {
          criterion_text: firstCriterion.criterion_text,
          is_first_question: true  // Tell AI Agent this is the first question
        });
        ai_question = formulateResponse.data?.formulated_question || ai_question;
      } catch (aiError) {
        console.error('[Node Backend] AI Agent failed to formulate first question:', aiError.response?.data || aiError.message);
        
        // Check if it's a rate limit error
        const errorMessage = aiError.response?.data?.detail || aiError.message || '';
        const isRateLimit = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit');
        
        if (isRateLimit) {
          // Use fallback welcome question
          console.warn('[Node Backend] Rate limit detected for first question, using fallback');
          // ai_question already has the fallback value
        } else {
          // For other errors, still use fallback but log the error
          console.warn('[Node Backend] AI Agent error (non-rate-limit), using fallback question');
        }
        // Don't throw error - continue with fallback question
      }

      conversation = new Conversation({
        conversation_id,
        current_index: 0,
        history: [],
        UserId: req.user.id
      });
      await conversation.save();

      return res.json({
        conversation_id,
        ai_question,
        current_criterion_id: firstCriterion.id
      });
    }

    // --- Case 2: Existing Conversation ---
    console.log(`[Node Backend] Existing conversation: ${conversation_id}`);
    const currentIndex = conversation.current_index;
    const history = conversation.history || [];
    const currentCriterion = getCriterionById(ALL_CRITERIA_IDS[currentIndex]);

    if (!currentCriterion) {
      console.error(`[Node Backend] Error: Criterion not found for index ${currentIndex}`);
      return res.status(500).json({ detail: 'Internal error: Current criterion not found.' });
    }

    // --- Step 1: Evaluate the current answer and get a reaction ---
    let evaluationResult = { evaluation: { score: 0, justification: 'Default score' }, ai_reaction: 'Okay.' }; // fallback value
    try {
      console.log(`[Node Backend] Calling AI Agent /evaluate_react for: ${currentCriterion.id}`);
      const evaluateResponse = await axios.post(`${AI_AGENT_URL}/api/v1/evaluate_react`, {
        user_answer: user_answer,
        current_criterion: currentCriterion
      });
      evaluationResult = evaluateResponse.data; // { evaluation: {...}, ai_reaction: "..." }
    } catch (aiError) {
      console.error('[Node Backend] AI Agent failed to evaluate/react:', aiError.response?.data || aiError.message);
      
      // Check if it's a rate limit error
      const errorMessage = aiError.response?.data?.detail || aiError.message || '';
      const isRateLimit = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit');
      
      if (isRateLimit) {
        // Use a default evaluation with a neutral score
        evaluationResult = {
          evaluation: {
            score: 1, // Default neutral score
            justification: 'Évaluation par défaut - service temporairement indisponible.'
          },
          ai_reaction: 'Merci pour votre réponse. Continuons.'
        };
        console.warn('[Node Backend] Rate limit detected, using default evaluation');
      } else {
        throw new Error(`AI Agent evaluation failed: ${errorMessage}`);
      }
    }

    // --- Step 2: Record the answer and evaluation in history ---
    // Check if there's a pending entry for this criterion that we should update
    const lastEntry = conversation.history[conversation.history.length - 1];
    const hasPendingEntry = lastEntry && 
                           lastEntry.user_answer === '__PENDING__' && 
                           lastEntry.criterion_id === currentCriterion.id;
    
    if (hasPendingEntry) {
      // Update the pending entry with the real answer
      lastEntry.user_answer = user_answer;
      lastEntry.evaluation = evaluationResult.evaluation;
      lastEntry.ai_reaction = evaluationResult.ai_reaction;
      // ai_question already exists in the entry
    } else {
      // Add a new entry
      const historyEntry = {
        criterion_id: currentCriterion.id,
        user_answer: user_answer,
        evaluation: evaluationResult.evaluation,
        ai_reaction: evaluationResult.ai_reaction,
        // ai_question will be added later
      };
      conversation.history.push(historyEntry);
    }

    // --- Step 3: Determine the next index (with Adaptive Skip) ---
    let final_next_index = currentIndex + 1; // الحالة العادية
    let didSkip = false;

    // Are we at the last Palier 1 criterion? (index 2, 14, 26, ...)
    // DISABLED: Adaptive skip feature to allow full diagnostic
    // Users will always complete all 72 questions for comprehensive assessment
    /*
    if (currentCriterion.id.endsWith("P1-C3")) {
      // Based on Palier 1 scores
      const palier1History = conversation.history.slice(-3); // آخر 3 أجوبة (C1, C2, C3)
      const totalPalier1Score = palier1History.reduce((sum, entry) => sum + (entry.evaluation?.score ?? 0), 0);
      console.log(`[Node Backend] Checking Adaptive Skip for ${currentCriterion.id}. Palier 1 Score: ${totalPalier1Score}/9`);

      if (totalPalier1Score <= 2) {
        const jumpIndex = getNextJumpIndex(currentIndex);
        if (jumpIndex !== null) {
          console.log(`[Node Backend] ADAPTIVE SKIP! Jumping from ${currentIndex} to ${jumpIndex}`);
          final_next_index = jumpIndex;
          didSkip = true;
        } else {
          console.log(`[Node Backend] Palier 1 score is low, but no further dimension to jump to. Finishing.`);
          final_next_index = ALL_CRITERIA_IDS.length; // finished
        }
      }
    }
    */

    // --- Step 4: Are we done with the diagnostic? ---
    if (final_next_index >= ALL_CRITERIA_IDS.length) {
      console.log(`[Node Backend] Diagnostic finished for: ${conversation_id}`);
      conversation.current_index = final_next_index; // update index
      conversation.status = 'finished';
      await conversation.save(); // save changes in DB
      return res.json({
        conversation_id,
        ai_question: `${evaluationResult.ai_reaction} merci pour votre réponse. Nous avons terminé le diagnostic. Nous allons maintenant préparer votre rapport.`,
        current_criterion_id: "FINISHED"
      });
    }

    const nextCriterionId = ALL_CRITERIA_IDS[final_next_index];
    const nextCriterion = getCriterionById(nextCriterionId);
    let final_ai_question_text = `Please tell me about: ${nextCriterion.criterion_text}`; // fallback question

    try {
      console.log(`[Node Backend] Calling AI Agent /formulate_question for: ${nextCriterion.id}`);
      // Never send is_first_question: true here, as this is after the first question
      const formulateResponse = await axios.post(`${AI_AGENT_URL}/api/v1/formulate_question`, {
        criterion_text: nextCriterion.criterion_text,
        is_first_question: false  // Explicitly set to false for subsequent questions
      });
      final_ai_question_text = formulateResponse.data.formulated_question;
    } catch (aiError) {
      console.error(`[Node Backend] AI Agent failed to formulate question for ${nextCriterion.id}:`, aiError.response?.data || aiError.message);
      
      // Check if it's a rate limit error
      const errorMessage = aiError.response?.data?.detail || aiError.message || '';
      const isRateLimit = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit');
      
      if (isRateLimit) {
        // Use a fallback question based on the criterion text
        final_ai_question_text = `Pouvez-vous me parler de: ${nextCriterion.criterion_text}?`;
        console.warn('[Node Backend] Rate limit detected, using fallback question');
      } else {
        throw new Error(`AI Agent formulation failed: ${errorMessage}`);
      }
    }


    conversation.history[conversation.history.length - 1].ai_question = final_ai_question_text;

    conversation.current_index = final_next_index;
    await conversation.save();

    let fullAiResponse = `${evaluationResult.ai_reaction} ${final_ai_question_text}`;
    if (didSkip) {
      fullAiResponse = `${evaluationResult.ai_reaction} d'après vos réponses précédentes, passons à la prochaine dimension. ${final_ai_question_text}`; // phrasing
    }

    return res.json({
      conversation_id,
      ai_question: fullAiResponse,
      current_criterion_id: nextCriterion.id,
      evaluation: evaluationResult.evaluation, // Include the score and justification
      score: evaluationResult.evaluation.score // Include score for easy access
    });

  } catch (error) {
    console.error('[Node Backend Mongoose] Error in handleChat:', error);
    const errorMessage = error.message || 'Internal Server Error in Node.js backend';
    res.status(500).json({ detail: errorMessage });
  }
};