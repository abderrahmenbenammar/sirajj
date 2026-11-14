import { normalizeArabicText } from "@/lib/text-normalization";

/**
 * Question-design quality gate shared by the AI generation route and the
 * manual admin server actions (zero answer leakage into the question stem).
 *
 * Two failure classes are detected:
 * - `revealsAnswer`: lexical leakage — the question copies the expected
 *   answer (or its distinctive opening / most of its words) verbatim.
 * - `isLeadingYesNoQuestion`: leading wording — a "هل ..." stem whose
 *   answer is implied by the phrasing itself instead of testing recall.
 */

/** True when the question reproduces the answer or a revealing chunk of it. */
export function revealsAnswer(question: string, answer: string): boolean {
  const normalizedQuestion = normalizeArabicText(question);
  const normalizedAnswer = normalizeArabicText(answer);
  if (!normalizedQuestion || !normalizedAnswer) return false;

  // The full answer embedded in the question.
  if (normalizedAnswer.length >= 8 && normalizedQuestion.includes(normalizedAnswer)) return true;

  const questionWords = normalizedQuestion.split(" ");
  const answerWords = normalizedAnswer.split(" ");
  if (answerWords.length < 4) return false;

  // Any run of 4+ consecutive answer words quoted inside the question
  // (catches "أكمل: <opening of the passage>" style stems).
  for (let answerIndex = 0; answerIndex <= answerWords.length - 4; answerIndex += 1) {
    for (let questionIndex = 0; questionIndex <= questionWords.length - 4; questionIndex += 1) {
      let matchingWords = 0;
      while (
        answerWords[answerIndex + matchingWords] === questionWords[questionIndex + matchingWords]
      ) {
        matchingWords += 1;
        if (matchingWords >= 4) return true;
        if (
          answerIndex + matchingWords >= answerWords.length ||
          questionIndex + matchingWords >= questionWords.length
        ) {
          break;
        }
      }
    }
  }

  // Word-coverage leakage: the question names (in any order) most of a long
  // answer — typical of reorder stems that re-list the scrambled words, or
  // fill_blank stems that paste the passage next to the blanks.
  if (answerWords.length >= 8) {
    const questionWordSet = new Set(questionWords);
    const matched = answerWords.filter((word) => questionWordSet.has(word)).length;
    if (matched / answerWords.length >= 0.6) return true;
  }

  return false;
}

/** True for leading yes/no stems whose phrasing implies the answer. */
export function isLeadingYesNoQuestion(question: string): boolean {
  return /^هل[\s؟]/.test(question.trim());
}

/** Combined gate: does the question stem have any design-quality issue? */
export function hasQuestionQualityIssue(question: string, answer: string): boolean {
  return revealsAnswer(question, answer) || isLeadingYesNoQuestion(question);
}
