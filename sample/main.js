chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('sample-led.html', {
    innerBounds: {
      width: 400,
      height: 150
    },
    resizable: false
  });
});
