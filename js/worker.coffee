importScripts "lib/whammy.js"

self.addEventListener 'message', (e) ->
  encoder = new Whammy.Video e.data[1]
  encoder.add frame for frame in e.data[0].reverse()
  encoder.compile false, (output) ->
    self.postMessage output
