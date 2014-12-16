chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('sample-led.html', {
    id: 'sampleMain',
    innerBounds: {
      width: 400,
      height: 150
    },
    resizable: false
  }, function(openedWindow) {
    chrome.app.window.get('sampleMain').onClosed.addListener(function() {
      chrome.app.window.get('virtualLed').close();
    });
  });
});
