import { HttpNetworkFrame } from "msw/experimental";
export function handleOne({ frame, defaults }) {
  if (!(frame instanceof HttpNetworkFrame)) {
    return;
  }

  const request = frame.data.request;
  console.log(request.url);
  defaults.warn();
}

export function handleTwo({ frame, defaults }) {
  if (!(frame instanceof HttpNetworkFrame)) {
    return;
  }

  const request = frame.data.request;
  console.log(request.method);
  defaults.error();
}
