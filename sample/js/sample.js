'use strict';

/*
 * Keeps track of the selected color
 */
var currentSelectedColor = "black";

/*
 * Handles the click on the color 'buttons' in the sample code app.
 * It uses the dell.led API to change the color of the LED to the chosen color clicked by the user.
 */
function handleColorClick(event) {
  event.preventDefault();
  var color = event.target.className;
  /* color should be valid following dell.led.colors array */
  dell.led.changeColor(color);
  chrome.runtime.sendMessage({
    color: color
  }, null);
  currentSelectedColor = color;
}

/*
 * Handles the enable/disable of the 'virtual LED', which is used to give a visual feedback to the user
 * if he/she don't have a chromebook with the Dell LED Utility.
 */
function handleEnableVirtualLED(event) {
  var el = event.target;
  if (el.checked) {
    chrome.app.window.create('virtual-led.html', {
      id: 'virtualLed',
      innerBounds: {
        width: 100,
        height: 40
      },
      resizable: false
    }, function(openedWindow) {
      chrome.app.window.get('virtualLed').onClosed.addListener(function() {
        el.checked = false;
      });
    });

    if (currentSelectedColor !== null) {
      setTimeout(function() {
        chrome.runtime.sendMessage({
          color: currentSelectedColor
        }, null);
      }, 200);
    }
  } else {
    chrome.app.window.get('virtualLed').close();
  }
}

/*
 * Initializes the listeners and the dell.led API to connect to the LED device.
 */
function initialize() {
  var colors = ['white', 'black', 'blue', 'red', 'green', 'yellow', 'cyan',
    'magenta'
  ];
  for (var i = 0; i < 8; i++) {
    var el = document.querySelector('.' + colors[i]);
    el.addEventListener('click', handleColorClick);
  }

  document.querySelector('.useVirtualLed').addEventListener('click',
    handleEnableVirtualLED);

  dell.led.initialize();
  setTimeout(function() {
    dell.led.turnOn();
  }, 300);
}

window.addEventListener('load', initialize);
