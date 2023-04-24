/*
Created by: Henrique Emanoel Viana
Github: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
export default class ConcatenatedErrorSilenced {
  constructor(e: any, msg: string = "", silenced: boolean = false) {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }
    if (msg) {
      e.message += ". " + msg;
    }
    if (silenced) {
      console.log(e);
    } else {
      throw e;
    }
  }
}
