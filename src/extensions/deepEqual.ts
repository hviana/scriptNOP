/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import diff from "../libs/diff_lib.ts";

export default function deepEqual(items: any[]): boolean {
  const a = items[0];
  return (items.slice(1).filter((b: any): boolean => {
    if (a === b) return true;
    if (a && b && typeof a === "object" && typeof b === "object") {
      return diff(a, b).length === 0;
    }
    // true if both NaN, false otherwise
    return a !== a && b !== b;
  }).length === (items.length - 1));
}
