export function handleOne(request, print) {
  console.log(request.url);
  print.warning();
}

export function handleTwo(request, print) {
  console.log(request.method);
  print.error();
}
