export type DiffPiece = {
  text: string;
  changed: boolean;
};

function normalize(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

function splitParts(value: string) {
  return value.split(/(\s+)/).filter((part) => part.length > 0);
}

function lcsTable(left: string[], right: string[]) {
  const table = Array.from({ length: left.length + 1 }, () =>
    new Uint16Array(right.length + 1),
  );
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      if (left[i - 1] && left[i - 1] === right[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }
  return table;
}

export function diffWords(left: string, right: string) {
  const leftParts = splitParts(left);
  const rightParts = splitParts(right);
  const leftWords = leftParts.flatMap((text, index) => {
    const key = normalize(text);
    return key ? [{ index, key }] : [];
  });
  const rightWords = rightParts.flatMap((text, index) => {
    const key = normalize(text);
    return key ? [{ index, key }] : [];
  });
  const table = lcsTable(
    leftWords.map((word) => word.key),
    rightWords.map((word) => word.key),
  );
  const leftMatch = new Set<number>();
  const rightMatch = new Set<number>();
  let i = leftWords.length;
  let j = rightWords.length;
  while (i > 0 && j > 0) {
    if (leftWords[i - 1].key === rightWords[j - 1].key) {
      leftMatch.add(leftWords[i - 1].index);
      rightMatch.add(rightWords[j - 1].index);
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const mark = (parts: string[], matches: Set<number>): DiffPiece[] =>
    parts.map((text, index) => ({
      text,
      changed: text.trim().length > 0 && !matches.has(index),
    }));

  return {
    left: mark(leftParts, leftMatch),
    right: mark(rightParts, rightMatch),
  };
}

export function changedWordCount(left: string, right: string) {
  return diffWords(left, right).right.filter((piece) => piece.changed).length;
}
