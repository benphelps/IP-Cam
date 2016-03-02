$ = (element) -> document.getElementById(element)

class Archive
  constructor: (@limit) ->
    @worker = new Worker 'js/worker.js'
    @storedAt = false
    @worker.addEventListener 'message', (e) =>
        link = document.createElement "a"
        link.download = moment(@storedAt).format('L LTS') + '.webm'
        link.href = window.URL.createObjectURL e.data
        link.click()
    @frames = []
    @floating = []
    @fps = 1

  framesPerSecond: ->
    @frameTime = new Date().getTime() - @frame
    if isNaN(@frameTime)
      @frameTime = 33
    @floating.unshift @frameTime
    @floating = @floating.slice 0, 20
    @fps = Math.round 1000 / @floating.average(), 0
    if isNaN(@fps)
      @fps = 1
    @fps

  storeFrame: (canvas, @frame) ->
    @frames.unshift canvas.toDataURL('image/webp', 1)
    @frames = @frames.slice 0, (@limit * 60) * @fps
    @framesPerSecond()

  downloadCurrent: ->
    @storedAt = new Date().getTime()
    @worker.postMessage [@frames, @fps]

class Viewer
  constructor: (@canvas) ->
    @archive = new Archive 1
    @canvas.width = 640
    @canvas.height = 480
    @context = @canvas.getContext '2d'
    @image = new Image()
    @image.crossOrigin = "anonymous"
    @fps = 0
    @image.addEventListener 'load', =>
      @renderFrame()
      return
    @renderFrame()

  renderFrame: ->
    @drawImage()
    @drawText "FPS: #{@fps}", 535, 440
    @drawText moment().format('L LTS'), 20, 440
    @fps = @archive.storeFrame @canvas, @frame
    @updateImage()

    return

  frameLink: ->
    cameraURL = encodeURIComponent("http://192.168.1.137/snapshot.cgi?user=view&pwd=pass&frame=#{@frame}")
    "http://localhost/proxy/proxy.php?url=#{cameraURL}"

  updateImage: ->
    @frame = (new Date).getTime()
    @image.src = @frameLink()
    return

  drawText: (text, x, y) ->
    # setup
    @context.globalCompositeOperation = 'source-over' # fixes drawing black
    @context.font = "bold 16px Roboto Mono"
    @context.fillStyle = 'rgba(0,0,0,0.75)'
    # background
    @context.beginPath()
    @context.fillRect x, y, @context.measureText(text).width + 20, 28
    # dropshadow
    @context.fillStyle = '#000000'
    @context.fillText text, x + 11, y + 21
    # text
    @context.fillStyle = '#FFFFFF'
    @context.fillText text, x + 10, y + 20
    return

  drawImage: ->
    @canvas.width = 640
    @canvas.height = 480
    @context.drawImage @image, 0, 0, @canvas.width, @canvas.height
    @context.globalCompositeOperation = "lighter"
    if window.innerWidth == 640 && window.innerHeight == 480
      @drawText "Driveway", 20, 20
    else
      @drawText "Driveway (#{window.innerWidth} x #{window.innerHeight})", 20, 20
    return


class Camera

  constructor: ->
    @cameraParams()
    @brightness = window.vbright
    @contrast = window.vcontrast
    @flip = window.flip

  cameraParams: ->
    document.write '<script type="text/javascript" src="http://192.168.1.137/get_camera_params.cgi?loginuse=phelps&loginpas=phelps"></script>'

  cameraControl: (req) ->
    cameraURL = encodeURIComponent("http://192.168.1.137/camera_control.cgi?loginuse=phelps&loginpas=phelps&#{req}&#{new Date().getTime()}")
    "http://localhost/proxy/proxy.php?url=#{cameraURL}"

  remoteRequest: (url, callback) ->
    req = new XMLHttpRequest
    req.addEventListener 'readystatechange', =>
      if req.readyState is 4
        successResultCodes = [200, 304]
        if req.status in successResultCodes
          if callback
            callback(req)
    req.open 'GET', url, false
    req.send()

  raw_command: (command, value) ->
    switch command
      when 'flip'
        @remoteRequest @cameraControl "param=5&value=#{value}"
      when 'mirror'
        @remoteRequest @cameraControl "param=5&value=#{value}"
      when 'brightness'
        @remoteRequest @cameraControl "param=1&value=#{value}"
      when 'contrast'
        @remoteRequest @cameraControl "param=2&value=#{value}"

  sendCommand: (command, value = false) ->
    switch command
      when 'flip'
        if @flip & 0x01
          @flip = @flip & 0x02
        else
          @flip = @flip | 0x01
        @raw_command 'flip', @flip
      when 'mirror'
        if @flip & 0x02
          @flip = @flip & 0x01
        else
          @flip = @flip | 0x02
        @raw_command 'flip', @flip
      when 'brightness'
        if isNaN @brightness
          @brightness = window.vbright
        @brightness += value
        if @brightness > 255
          @brightness = 255
        if @brightness < 0
          @brightness = 0
        @raw_command 'brightness', @brightness
      when 'contrast'
        if isNaN @contrast
          @contrast = window.vcontrast
        @contrast += value
        if @contrast > 255
          @contrast = 255
        if @contrast < 0
          @contrast = 0
        @raw_command 'contrast', @contrast

viewer = new Viewer $('camera')
camera = new Camera()

$('download').addEventListener 'click', ->
  viewer.archive.downloadCurrent()

$('flip').addEventListener 'click', ->
  camera.sendCommand('flip')

$('mirror').addEventListener 'click', ->
  camera.sendCommand('mirror')

$('brightness').addEventListener 'mousewheel', (e) ->
  if e.wheelDelta > 0
    camera.sendCommand('brightness', 10)
  else
    camera.sendCommand('brightness', -10)

$('contrast').addEventListener 'mousewheel', (e) ->
  if e.wheelDelta > 0
    camera.sendCommand('contrast', 10)
  else
    camera.sendCommand('contrast', -10)
