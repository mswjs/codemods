import { setupWorker } from "msw/browser";
import { defineNetwork } from "msw/experimental";

export const worker = setupWorker();

await worker.start({
  onUnhandledRequest: (req) => console.log(`Unhandled ${req.method} ${req.url}`),
});

await worker.start({
  onUnhandledRequest: async function (request: Request, print) {
    print.error();
  },
});

await worker.start({
  onUnhandledRequest: () => {},
});
