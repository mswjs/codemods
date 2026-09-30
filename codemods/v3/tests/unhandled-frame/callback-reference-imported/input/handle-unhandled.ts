export function handleUnhandled(request, print) {
  console.log(request.url);
  print.warning();
}
