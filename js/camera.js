(function() {
  var $, Archive, Camera, Viewer, camera, viewer,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = function(element) {
    return document.getElementById(element);
  };

  Archive = (function() {
    function Archive(limit) {
      this.limit = limit;
      this.worker = new Worker('js/worker.js');
      this.storedAt = false;
      this.worker.addEventListener('message', (function(_this) {
        return function(e) {
          var link;
          link = document.createElement("a");
          link.download = moment(_this.storedAt).format('L LTS') + '.webm';
          link.href = window.URL.createObjectURL(e.data);
          return link.click();
        };
      })(this));
      this.frames = [];
      this.floating = [];
      this.fps = 1;
    }

    Archive.prototype.framesPerSecond = function() {
      this.frameTime = new Date().getTime() - this.frame;
      if (isNaN(this.frameTime)) {
        this.frameTime = 33;
      }
      this.floating.unshift(this.frameTime);
      this.floating = this.floating.slice(0, 20);
      this.fps = Math.round(1000 / this.floating.average(), 0);
      if (isNaN(this.fps)) {
        this.fps = 1;
      }
      return this.fps;
    };

    Archive.prototype.storeFrame = function(canvas, frame) {
      this.frame = frame;
      this.frames.unshift(canvas.toDataURL('image/webp', 1));
      this.frames = this.frames.slice(0, (this.limit * 60) * this.fps);
      return this.framesPerSecond();
    };

    Archive.prototype.downloadCurrent = function() {
      this.storedAt = new Date().getTime();
      return this.worker.postMessage([this.frames, this.fps]);
    };

    return Archive;

  })();

  Viewer = (function() {
    function Viewer(canvas) {
      this.canvas = canvas;
      this.archive = new Archive(1);
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.context = this.canvas.getContext('2d');
      this.image = new Image();
      this.image.crossOrigin = "anonymous";
      this.fps = 0;
      this.image.addEventListener('load', (function(_this) {
        return function() {
          _this.renderFrame();
        };
      })(this));
      this.renderFrame();
    }

    Viewer.prototype.renderFrame = function() {
      this.drawImage();
      this.drawText("FPS: " + this.fps, 535, 440);
      this.drawText(moment().format('L LTS'), 20, 440);
      this.fps = this.archive.storeFrame(this.canvas, this.frame);
      this.updateImage();
    };

    Viewer.prototype.frameLink = function() {
      var cameraURL;
      cameraURL = encodeURIComponent("http://192.168.1.137/snapshot.cgi?user=view&pwd=pass&frame=" + this.frame);
      return "http://localhost/proxy/proxy.php?url=" + cameraURL;
    };

    Viewer.prototype.updateImage = function() {
      this.frame = (new Date).getTime();
      this.image.src = this.frameLink();
    };

    Viewer.prototype.drawText = function(text, x, y) {
      this.context.globalCompositeOperation = 'source-over';
      this.context.font = "bold 16px Roboto Mono";
      this.context.fillStyle = 'rgba(0,0,0,0.75)';
      this.context.beginPath();
      this.context.fillRect(x, y, this.context.measureText(text).width + 20, 28);
      this.context.fillStyle = '#000000';
      this.context.fillText(text, x + 11, y + 21);
      this.context.fillStyle = '#FFFFFF';
      this.context.fillText(text, x + 10, y + 20);
    };

    Viewer.prototype.drawImage = function() {
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.context.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
      this.context.globalCompositeOperation = "lighter";
      if (window.innerWidth === 640 && window.innerHeight === 480) {
        this.drawText("Driveway", 20, 20);
      } else {
        this.drawText("Driveway (" + window.innerWidth + " x " + window.innerHeight + ")", 20, 20);
      }
    };

    return Viewer;

  })();

  Camera = (function() {
    function Camera() {
      this.cameraParams();
      this.brightness = window.vbright;
      this.contrast = window.vcontrast;
      this.flip = window.flip;
    }

    Camera.prototype.cameraParams = function() {
      return document.write('<script type="text/javascript" src="http://192.168.1.137/get_camera_params.cgi?loginuse=phelps&loginpas=phelps"></script>');
    };

    Camera.prototype.cameraControl = function(req) {
      var cameraURL;
      cameraURL = encodeURIComponent("http://192.168.1.137/camera_control.cgi?loginuse=phelps&loginpas=phelps&" + req + "&" + (new Date().getTime()));
      return "http://localhost/proxy/proxy.php?url=" + cameraURL;
    };

    Camera.prototype.remoteRequest = function(url, callback) {
      var req;
      req = new XMLHttpRequest;
      req.addEventListener('readystatechange', (function(_this) {
        return function() {
          var successResultCodes, _ref;
          if (req.readyState === 4) {
            successResultCodes = [200, 304];
            if (_ref = req.status, __indexOf.call(successResultCodes, _ref) >= 0) {
              if (callback) {
                return callback(req);
              }
            }
          }
        };
      })(this));
      req.open('GET', url, false);
      return req.send();
    };

    Camera.prototype.raw_command = function(command, value) {
      switch (command) {
        case 'flip':
          return this.remoteRequest(this.cameraControl("param=5&value=" + value));
        case 'mirror':
          return this.remoteRequest(this.cameraControl("param=5&value=" + value));
        case 'brightness':
          return this.remoteRequest(this.cameraControl("param=1&value=" + value));
        case 'contrast':
          return this.remoteRequest(this.cameraControl("param=2&value=" + value));
      }
    };

    Camera.prototype.sendCommand = function(command, value) {
      if (value == null) {
        value = false;
      }
      switch (command) {
        case 'flip':
          if (this.flip & 0x01) {
            this.flip = this.flip & 0x02;
          } else {
            this.flip = this.flip | 0x01;
          }
          return this.raw_command('flip', this.flip);
        case 'mirror':
          if (this.flip & 0x02) {
            this.flip = this.flip & 0x01;
          } else {
            this.flip = this.flip | 0x02;
          }
          return this.raw_command('flip', this.flip);
        case 'brightness':
          if (isNaN(this.brightness)) {
            this.brightness = window.vbright;
          }
          this.brightness += value;
          if (this.brightness > 255) {
            this.brightness = 255;
          }
          if (this.brightness < 0) {
            this.brightness = 0;
          }
          return this.raw_command('brightness', this.brightness);
        case 'contrast':
          if (isNaN(this.contrast)) {
            this.contrast = window.vcontrast;
          }
          this.contrast += value;
          if (this.contrast > 255) {
            this.contrast = 255;
          }
          if (this.contrast < 0) {
            this.contrast = 0;
          }
          return this.raw_command('contrast', this.contrast);
      }
    };

    return Camera;

  })();

  viewer = new Viewer($('camera'));

  camera = new Camera();

  $('download').addEventListener('click', function() {
    return viewer.archive.downloadCurrent();
  });

  $('flip').addEventListener('click', function() {
    return camera.sendCommand('flip');
  });

  $('mirror').addEventListener('click', function() {
    return camera.sendCommand('mirror');
  });

  $('brightness').addEventListener('mousewheel', function(e) {
    if (e.wheelDelta > 0) {
      return camera.sendCommand('brightness', 10);
    } else {
      return camera.sendCommand('brightness', -10);
    }
  });

  $('contrast').addEventListener('mousewheel', function(e) {
    if (e.wheelDelta > 0) {
      return camera.sendCommand('contrast', 10);
    } else {
      return camera.sendCommand('contrast', -10);
    }
  });

}).call(this);
