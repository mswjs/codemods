import { setupServer } from "msw/node";
import { HttpNetworkFrame } from "msw/experimental";

export const server = setupServer();

function handleUnhandled({ frame, defaults }) {
  if (!(frame instanceof HttpNetworkFrame)) {
    return;
  }

  const request = frame.data.request;
  console.log(request.url);
  defaults.warn();
}

function handleBoth(request, print) {
  console.log(request.url);
  print.warning();
}

server.listen({ onUnhandledFrame: handleUnhandled });
server.listen({ onUnhandledFrame: handleBoth });
handleBoth(new Request("https://example.com"), { warning() {} });
