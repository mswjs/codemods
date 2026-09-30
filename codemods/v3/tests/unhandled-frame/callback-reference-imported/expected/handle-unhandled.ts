import { HttpNetworkFrame } from "msw/experimental";
export function handleUnhandled({ frame, defaults }) {
  if (!(frame instanceof HttpNetworkFrame)) {
    return;
  }

  const request = frame.data.request;
  console.log(request.url);
  defaults.warn();
}
