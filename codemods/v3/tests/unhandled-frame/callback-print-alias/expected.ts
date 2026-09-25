import { setupServer } from "msw/node";
import { report } from "./report";
import { HttpNetworkFrame } from "msw/experimental";

export const server = setupServer();

server.listen({
  onUnhandledFrame({ frame, defaults }) {
    if (!(frame instanceof HttpNetworkFrame)) {
      return;
    }

    const request = frame.data.request;
    const print = { warning: defaults.warn, error: defaults.error };
    defaults.error();
    report(request, print);
  },
});
