importScripts("whammy.js");

self.addEventListener('message', function(e) {
  var data = e.data[0];
  var encoder = new Whammy.Video(e.data[1]);
  for (var i = data.length - 1; i > 0; i--) {
    encoder.add(data[i]);
  }
  encoder.compile(false, function(output){
    self.postMessage(output);
  });
}, false);
