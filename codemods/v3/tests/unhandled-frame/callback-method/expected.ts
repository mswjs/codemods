import { setupServer } from "msw/node";
import { HttpNetworkFrame } from "msw/experimental";

export const server = setupServer();

server.listen({
  onUnhandledFrame({ frame, defaults }) {
    if (!(frame instanceof HttpNetworkFrame)) {
      return;
    }

    const request = frame.data.request;
    if (request.url.includes("/health")) {
      return;
    }

    console.log(`Oops, unhandled ${request.method} ${request.url}`);
    defaults.warn();
  },
});
