import { setupServer } from "msw/node";
import { HttpNetworkFrame } from "msw/experimental";

export const server = setupServer();

server.listen({
  onUnhandledFrame: ({ frame, defaults }) => {
    if (!(frame instanceof HttpNetworkFrame)) {
      return;
    }

    const request = frame.data.request;
    const config = { onUnhandledRequest: "ignore" };
    console.log(request.url, config);
    defaults.warn();
  },
  nested: {
    onUnhandledRequest: "error",
  },
});
