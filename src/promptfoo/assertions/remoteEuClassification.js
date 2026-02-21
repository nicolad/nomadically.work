/**
 * Promptfoo assertion for EU remote classification eval.
 *
 * Expected vars (set by d1-test-generator.ts on each test case):
 *   context.vars.expectedIsRemoteEU   — boolean (DB ground truth)
 *   context.vars.expectedConfidence   — "high"|"medium"|"low"
 *
 * Scores:
 *   1.0 — correct classification AND confidence matches DB
 *   0.5 — correct classification, wrong confidence
 *   0.0 — wrong classification (or unparseable JSON)
 */
module.exports = (output, context) => {
  const expectedIsRemoteEU = context.vars.expectedIsRemoteEU;
  const expectedConfidence = context.vars.expectedConfidence;

  let parsed;
  try {
    const m = output.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : output);
  } catch (e) {
    return { pass: false, score: 0, reason: "Failed to parse JSON: " + e.message };
  }

  const gotClass = parsed.isRemoteEU === expectedIsRemoteEU;
  const gotConf = parsed.confidence === expectedConfidence;

  if (!gotClass) {
    return {
      pass: false,
      score: 0,
      reason:
        "Wrong classification: expected isRemoteEU=" +
        expectedIsRemoteEU +
        ", got " +
        parsed.isRemoteEU +
        " (confidence=" +
        parsed.confidence +
        ")",
    };
  }
  if (!gotConf) {
    return {
      pass: true,
      score: 0.5,
      reason:
        "Correct class but wrong confidence: expected " +
        expectedConfidence +
        ", got " +
        parsed.confidence,
    };
  }
  return { pass: true, score: 1, reason: "Exact match" };
};
