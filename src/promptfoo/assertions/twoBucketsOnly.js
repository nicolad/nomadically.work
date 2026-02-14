// src/promptfoo/assertions/twoBucketsOnly.js
module.exports = (output, context) => {
  let obj;
  try {
    obj = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    return false;
  }

  const keys = Object.keys(obj).sort();
  return keys.length === 2 && keys[0] === "europe" && keys[1] === "worldwide";
};
