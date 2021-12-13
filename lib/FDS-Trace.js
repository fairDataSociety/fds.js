let enabled = false

class FDSTrace {
  log() {
    if (enabled === true) {
      console.log(...arguments)
    }
  }

  time(a) {
    if (enabled === true) {
      console.time(a)
    }
  }

  timeEnd(a) {
    if (enabled === true) {
      console.timeEnd(a)
    }
  }
}

export default new FDSTrace()
