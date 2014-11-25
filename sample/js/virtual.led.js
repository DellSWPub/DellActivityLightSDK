'use strict';

window.addEventListener('load', function(event) {
  chrome.runtime.onMessage.addListener(function(request, sender,
    sendResponse) {
    document.getElementById('virtualLed').className = "color " +
      request.color;
  });
});
