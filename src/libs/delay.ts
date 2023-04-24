/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

export default function delay(ms: number): Promise<void> {
  return new Promise((res): number =>
    setTimeout((): void => {
      res();
    }, ms)
  );
}
