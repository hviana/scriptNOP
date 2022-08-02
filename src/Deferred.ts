export default class Deferred {
  promise: Promise<any>;
  reject: Function = () => undefined;
  resolve: Function = () => undefined;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}
