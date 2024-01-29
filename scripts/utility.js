'use strict';

/**
 * 与えられた数を符号なし 32 ビット整数に変換したときの 1 のビットの数を返す。
 * @param {number} x
 * @returns {number}
 */
function popcount(x) {
  // 参考にしたページ：
  // https://en.wikipedia.org/wiki/Hamming_weight
  // https://stackoverflow.com/questions/43122082/efficiently-count-the-number-of-bits-in-an-integer-in-javascript
  x -= (x & 0xAAAAAAAA) >>> 1;
  x = (x & 0x33333333) + ((x & 0xCCCCCCCC) >>> 2);
  x = ((x + (x >>> 4)) & 0x0F0F0F0F);
  return (x * 0x01010101) >>> 24;
}

/**
 * 配列の中に重複する要素があるかどうかを true または false で返す。
 * @param {Array} array
 * @returns {boolean}
 */
function hasDuplicate(array) {
  const previousElements = new Set();
  for (const element of array) {
    if (previousElements.has(element)) {
      return true;
    }
    previousElements.add(element);
  }
  return false;
}