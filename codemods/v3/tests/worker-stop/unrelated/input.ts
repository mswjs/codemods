const recorder = new MediaRecorder(stream)

function stop() {
  recorder.stop()
  service.worker.stop()
}
