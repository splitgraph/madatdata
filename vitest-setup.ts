// NOTE: `fetch` needs to be polyfilled in Node.
// The dependency is in the root of the mono-repo, and any package that relies
// on it is responsible for polyfilling it in its own bundle
import "cross-fetch/polyfill";
