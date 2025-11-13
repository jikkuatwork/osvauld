// Process shim for browser
export const nextTick = (fn, ...args) => {
  Promise.resolve().then(() => fn(...args));
};

export const env = { NODE_ENV: 'production' };
export const browser = true;

export default {
  nextTick,
  env,
  browser
};
