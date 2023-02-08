// https://stackoverflow.com/a/24810220/3793499
export const randSuffix = () =>
  new Array(5).join().replace(/(.|$)/g, function () {
    return ((Math.random() * 36) | 0).toString(36);
  });
