/**
 * Wrap text to a specified width
 * @param {string} s - String to wrap
 * @param {number} w - Width to wrap at
 * @returns {string} Wrapped string
 */
export const wrap = (s, w = 60) => {
  if (!s) return "";
  return s
    .split(/\s+/)
    .reduce((acc, word) => {
      const last = acc[acc.length - 1];
      if (last && (last + word).length < w) acc[acc.length - 1] += " " + word;
      else acc.push(word);
      return acc;
    }, [])
    .join("\n");
};
