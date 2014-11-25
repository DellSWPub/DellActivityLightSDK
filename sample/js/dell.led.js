'use strict';
/*
 * High level object used to expose Simulator features through a Javascript API.
 */
(function(exports) {

  var logger = exports.logger || {};
  logger.currentLogLevel = 'warn';
  logger.log = function(level, msg) {
    if (level === this.currentLogLevel) {
      var now = new Date();
      console.log('[' + now + '][' + level.toUpperCase() + '] ' + msg);
    }
  };

  exports.logger = logger;

  var dell;
  if (exports.dell === undefined) {
    dell = {};
  } else {
    dell = exports.dell;
  }
  /*
   * LED related methods. Users of the API shoudl access this object
   * in order to manipulate the LED, like changing colors, turning it on and off
   * or blinking it or not.
   */
  dell.led = {};
  dell.led.connectionId = null;
  dell.led.deviceId = null;
  dell.led.HID_VENDOR_ID = 0x04D8;
  dell.led.HID_PRODUCT_ID_1 = 0x0B28;
  dell.led.HID_PRODUCT_ID_2 = 0x0100;
  dell.led.DEVICE_INFO = [{
    "vendorId": dell.led.HID_VENDOR_ID,
    "productId": dell.led.HID_PRODUCT_ID_1
  },
  {
    "vendorId": dell.led.HID_VENDOR_ID,
    "productId": dell.led.HID_PRODUCT_ID_2
  },
  ];
  dell.led.COMMAND_SIZE = 64;
  dell.led.LED_STOP_TIME = 30; // 30 * 50ms = 1 sec
  dell.led.HEARBEAT_INTERVAL = 500; // 500 ms
  exports.heartBeatInterval = null; // interval object

  /*
   * Initializes the HID device by creating a connection to it, which will be used
   * to send and read commands to it.
   * Must be called once before any command can be sent to the device.
   */
  dell.led.initialize = function(postInitialize, onAfterConnectionSuccess) {


    if (window.chrome === undefined) {
      logger.log('debug', 'null windows');
      return;
    }

    // Try to open the USB HID device
    dell.led._connectDevice(dell.led.DEVICE_INFO[0], postInitialize, onAfterConnectionSuccess);
    dell.led._connectDevice(dell.led.DEVICE_INFO[1], postInitialize, onAfterConnectionSuccess);
  };

  /*
   * connect to specific device, NOTE!, it will overwrite existing connectionId.
   */
  dell.led._connectDevice = function(deviceInfo, postInitialize, onAfterConnectionSuccess) {
    logger.log('debug', 'connecting device: ' + dell.led.HID_VENDOR_ID +
      ':' + dell.led.HID_PRODUCT_ID);

    chrome.hid.getDevices(deviceInfo, function(devices){
      if (!devices || !devices.length) {
      logger.log('debug', 'device not found');
      return;
      }

      logger.log('debug', 'Found device: ' + devices[0].deviceId);
      dell.led.deviceId = devices[0].deviceId;

      // Connect to the HID device
      chrome.hid.connect(dell.led.deviceId, function(connection){
        if (chrome.runtime.lastError) {
            logger.log('debug', 'connection error:' + chrome.runtime.lastError
            .message);
            return;
        }

        logger.log('debug', 'Connected to the HID device!');
        dell.led.connectionId = connection.connectionId;

        // post Initialize the usb
        if (postInitialize !== null && postInitialize !== undefined) {
            postInitialize();
        } else {
            dell.led._postInitialize();
        }

        // Poll the USB HID Interrupt pipe
        if (onAfterConnectionSuccess != null) {
            onAfterConnectionSuccess();
        }
      });
    });
  }

  /*
   * callback to handle device connection
   */
  dell.led._getDeviceCallBack = function(devices) {
  }

  /*
   * Creates a command data array to be used with '_sendCommand' method. It receives as
   * a parameter the color name and translates it to the correct code, so the HID device can
   * understand.
   */
  dell.led._createCommandDataForColor = function(colorName) {
    var commandData = new Uint8Array(dell.led.COMMAND_SIZE);
    for (var i = 0; i < dell.led.COMMAND_SIZE; i++) {
      commandData[i] = 0xff;
    }

    commandData[0] = 0x11; // command of color

    switch (colorName) {
      case 'black':
        commandData[1] = 0x08;
        break;
      case 'white':
        commandData[1] = 0x07;
        break;
      case 'red':
        commandData[1] = 0x01;
        break;
      case 'green':
        commandData[1] = 0x02;
        break;
      case 'blue':
        commandData[1] = 0x03;
        break;
      case 'yellow':
        commandData[1] = 0x04;
        break;
      case 'cyan':
        commandData[1] = 0x06;
        break;
      case 'magenta':
        commandData[1] = 0x05;
        break;
    }

    return commandData;
  };

  /*
   * Send command to the HID device.
   */
  dell.led._sendCommandToHIDDevice = function(commandData) {
    if (dell.led.connectionId === null) {
      logger.log('debug', 'invalid connectionId');
      return;
    }

    commandData[3] = dell.led._random(); //add random for security reason
    commandData[2] = dell.led._calculateCheckSum(commandData[0],
      commandData[1], commandData[3]); // add checksum

    chrome.hid.send(dell.led.connectionId, 0, commandData.buffer, function() {
      if (chrome.runtime.lastError) {
        logger.log('debug', 'Unable to set feature report: ' + chrome.runtime
          .lastError.message);
      }
    });
  };

  /*
   * Create checksum for the commands
   */
  dell.led._random = function() {
    var random = (Math.random() * 256) % 255;
    return random;
  };

  /*
   * Create checksum for the commands
   */
  dell.led._calculateCheckSum = function(byte0, byte1, byte3) {
    var checksum = (21 * byte0 * byte0 + 19 * byte1 - 3 * byte3) % 255;
    return checksum;
  };


  /*
   * Keeps track of the last selected color set for the LED.
   */
  dell.led._lastSelectedColor = null;
  dell.led._isOn = false;

  /*
   * Collection of the possible colors that the LED can be set to.
   * For now it uses HTML color names but in the future it could use
   * color codes of any type, since it makes sense to the LED hardware.
   */
  dell.led.colors = {
    WHITE: 'white',
    RED: 'red',
    GREEN: 'green',
    BLUE: 'blue',
    YELLOW: 'yellow',
    CYAN: 'cyan',
    MAGENTA: 'magenta',
    BLACK: 'black'
  };

  /*
   * Indicates if the LED is turned on or off.
   */
  dell.led.isOn = function() {
    return this._isOn === true;
  };

  /*
   * to turn off the LED by default in postInitialize
   */
  dell.led._postInitialize = function() {
    var commandData = dell.led._createCommandDataForColor('black');
    dell.led._sendCommandToHIDDevice(commandData);
    dell.led._setOnStopTimeout();
  };

  /*
   * Turns the LED on if it is connected to the device.
   * Also opens the LED screen which show the user what color the LED is showing at the moment.
   */
  dell.led.turnOn = function() {
    if (window.chrome === undefined) {
      return;
    }
    //try to connect to the HID device
    if (dell.led.connectionId === null) {
      dell.led.initialize(dell.led._postInitialize, null);
    }
    dell.led._isOn = true;
  };

  /*
   * Turns the LED off if it is connected to the device.
   * Also closes the LED screen.
   */
  dell.led.turnOff = function() {
    dell.led.changeColor(this.colors.BLACK);
    dell.led._stopOnHeartBeat();
    dell.led._isOn = false;
  };

  /*
   * Turns off the LED when the application is suspended.
   */
  dell.led.turnOffOnSuspend = function() {
    if (dell !== undefined && dell.led.isOn() === false) {
      dell.led.initialize(function() {
        dell.led.turnOff();
      }, null);
    } else {
      dell.led.turnOff();
    }
  };

  /*
   * Exits the LED controller Chrome App.
   * If the LED is connected to the device, it turns the off and also
   * closes the LED screen and the color panel screen.
   */
  dell.led.exit = function() {
    if (dell.led.isOn() === true) {
      dell.led.turnOff();
    }

    if (chrome.app && chrome.app.window !== undefined) {
      var mainWindow = chrome.app.window.get('led-control-app');
      if (mainWindow !== undefined && mainWindow !== null) {
        mainWindow.close();
      }
    }
  };

  /*
   * Set LED stop time, with times of 50ms
   */
  dell.led._setOnStopTimeout = function() {
    var commandData = new Uint8Array(dell.led.COMMAND_SIZE);
    for (var i = 0; i < dell.led.COMMAND_SIZE; i++) {
      commandData[i] = 0xff;
    }
    commandData[0] = 0x25;
    commandData[1] = dell.led.LED_STOP_TIME;

    dell.led._sendCommandToHIDDevice(commandData);
  };

  /*
   * Start Heart Beat with LED, to ensure it's always on.
   */
  dell.led._startOnHeartBeat = function() {
    if (dell.led.connectionId == null) {
      logger.log('debug', 'init retry');
      dell.led.initialize(dell.led._postInitialize, null);
      setTimeout(function() {
        if (dell.led._lastSelectedColor != null) {
          var commandData = dell.led._createCommandDataForColor(dell.led
            ._lastSelectedColor);
          dell.led._sendCommandToHIDDevice(commandData);
        }
      }, 200);
    }

    if (heartBeatInterval != null) {
      clearInterval(heartBeatInterval);
      heartBeatInterval = null;
    }

    heartBeatInterval = setInterval(function() {
      if (dell.led._lastSelectedColor != null) {
        var commandData = dell.led._createCommandDataForColor(dell.led._lastSelectedColor);
        dell.led._sendCommandToHIDDevice(commandData);
      }
    }, dell.led.HEARBEAT_INTERVAL);

  };

  /*
   * Stop Heart Beat with LED, so that LED will off
   */
  dell.led._stopOnHeartBeat = function() {
    if (heartBeatInterval != null) {
      clearInterval(heartBeatInterval);
      heartBeatInterval = null;
    }
  };

  /*
   * Changes the LED color by setting the received color code as the current color.
   */
  dell.led.changeColor = function(color) {
    var colorValues = [];
    for (var key in dell.led.colors) {
      colorValues.push(dell.led.colors[key]);
    }
    if (colorValues.indexOf(color) == -1) {
      throw 'Invalid color';
    }
    if (this.isOn() === true) {
      this._lastSelectedColor = color;
      var commandData = this._createCommandDataForColor(color);
      this._sendCommandToHIDDevice(commandData);
      dell.led._startOnHeartBeat();
    }
  };

  exports.dell = dell;
})(window);
