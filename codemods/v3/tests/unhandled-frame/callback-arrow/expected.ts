import { setupWorker } from "msw/browser";
import { defineNetwork, HttpNetworkFrame } from "msw/experimental";

export const worker = setupWorker();

await worker.start({
  onUnhandledFrame: ({ frame }) => {
    if (!(frame instanceof HttpNetworkFrame)) {
      return;
    }

    const req = frame.data.request;
    return console.log(`Unhandled ${req.method} ${req.url}`);
  },
});

await worker.start({
  onUnhandledFrame: async function ({ frame, defaults }) {
    defaults.error();
  },
});

await worker.start({
  onUnhandledFrame: ({ frame }) => {},
});
