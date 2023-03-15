// This is a shim for the 'crypto' module, so that esbuild can import this shim.
// We can't use esbuild externals, because that produces a "dynamic require,"
// As long as our consuming code only attempts to access 'webcrypto' so long
// as window.crypto does not exist, then it's okay that this is an empty shim.
export const webcrypto = {
  subtle: () => {
    throw new Error("This shouldn't actually be called");
  },
};
