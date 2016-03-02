(function() {
  importScripts("lib/whammy.js");

  self.addEventListener('message', function(e) {
    var encoder, frame, _i, _len, _ref;
    encoder = new Whammy.Video(e.data[1]);
    _ref = e.data[0].reverse();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      frame = _ref[_i];
      encoder.add(frame);
    }
    return encoder.compile(false, function(output) {
      return self.postMessage(output);
    });
  });

}).call(this);
