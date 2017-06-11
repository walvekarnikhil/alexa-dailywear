var Alexa = require('alexa-sdk');
var ForecastService = require('./forecastService');
var Q = require('q');

var forecastServieAppId;
var helpMessage = 'Hello, I can provide suggestion to wear sweater or not. ' +
                'Just give me temperature below which you would like to ' +
                'wear sweater and the zip code. ' +
                'I can look up your current temperature and suggest to wear / carry sweater or not. ' +
                'Would you like to give it a try?';

exports.handler = function(event, context, callback){
    var alexa = Alexa.handler(event, context);
};

var _ATTR_PREFERENCES = "PREFERENCES";
var _ATTR_PREF_ZIP = "PREF_ZIP";
var _ATTR_PREF_LOW_TEMP = "PREF_LOW_TEMP";
var _STEP = "STEP";

var resetPreferences = function(attributes) {
  attributes[_ATTR_PREFERENCES] = undefined;
  attributes[_STEP] = "RESET";
}

var setPreference = function(attributes, attributeName, attributeValue) {
  var preferences = attributes[_ATTR_PREFERENCES] || {};
  preferences[attributeName] = attributeValue;
  attributes[_ATTR_PREFERENCES] = preferences;
}
var getPreference = function(attributes, attributeName) {
  var preferences = attributes[_ATTR_PREFERENCES] || {};
  return preferences[attributeName];
}
var setZip = function(attributes, zip) {
  setPreference(attributes, _ATTR_PREF_ZIP, zip);
}

var setLowTemp = function(attributes, temp) {
  setPreference(attributes, _ATTR_PREF_LOW_TEMP, temp);
}
var getZip = function(attributes) {
  return getPreference(attributes, _ATTR_PREF_ZIP);
}

var getLowTemp = function(attributes) {
  return getPreference(attributes, _ATTR_PREF_LOW_TEMP);
}

var validateZip = function(zip) {
  return true;
}

var validateTemp = function(temp) {
  return true;
}

var getForecast = function(zip) {
  var deferred = Q.defer();
  ForecastService.get(zip,forecastServieAppId)
    .then(function(res) {
      deferred.resolve(res.main.temp);
    }, function(err){
      deferred.reject(err);
    });
  return deferred.promise;
}

var getSuggestion = function(attributes) {
  var deferred = Q.defer();
  // get preferences
  var zip = getZip(attributes);
  var lowTemp = parseInt(getLowTemp(attributes));
  // get current temperature
  getForecast(zip).then(function(temp) {
    // check if low than temp then sweater
    console.log("checking temp",temp,lowTemp);
    if (temp <= lowTemp) {
      deferred.resolve("As per today's weather, it will be good to carry a sweater with you.");
    } else {
      deferred.resolve("As per today's weather, it will be OK if you don't carry a sweater with you.");
    }
  }, function(err){
    //do nothing right now
    deferred.resolve("There was some problem to retrieve temperature, please try after some time.");
  });
  return deferred.promise;
}

var arePreferencesSet = function(attributes) {
  // console.log('arePreferencesSet',attributes);
  if (Object.keys(attributes).length === 0) {
    return false;
  }

  var preferences = attributes[_ATTR_PREFERENCES];
  var zipSet = preferences && preferences[_ATTR_PREF_ZIP];
  var tempSet = preferences && preferences[_ATTR_PREF_LOW_TEMP];
  console.log('arePreferencesSet', preferences, zipSet, tempSet, preferences != null && zipSet != null && tempSet != null);
  return preferences != null && zipSet != null && tempSet != null;
}

var handlers = {
  'LaunchRequest': function () {
    console.log('LaunchRequest', this.event.request);
    this.emit('GetSuggestion');
  },
  'GetZip' : function() {
    var message = '';
    if (this.attributes[_STEP] === "RESET") {
      message += 'I have reset your preferences as requested.';
      // this.attributes[_STEP] = undefined;
    }
    message += ' Welcome to Daily wear, I will give you suggestion to wear sweater or not. ' +
    'Please mention your zip code.';
    var rePrompt = 'Please mention your zip code, example 94089';
    this.attributes[_STEP] = _ATTR_PREF_ZIP;
    this.emit(':ask', message, rePrompt);
  },
  'ReadNumber' : function() {
    var value = this.event.request.intent.slots.number.value;
    var step = this.attributes[_STEP];

    switch (step) {
      case _ATTR_PREF_ZIP:
        if (validateZip(value)) {
          setZip(this.attributes, value);
          this.emit('GetTemp');
        } else {
          var message = 'I did not get the zip you mentioned, please try again';
          this.emit(':ask', message, message);
        }
        break;
      case _ATTR_PREF_LOW_TEMP:
        if (validateTemp(value)) {
          setLowTemp(this.attributes, value);
          this.attributes[_STEP] = undefined;
          this.emit('GetSuggestion');
        } else {
          var message = 'I did not get temperature you mentioned, please try again';
          this.emit(':ask', message, message);
        }
        break;
    }
  },
  'GetTemp' : function() {
    var message = 'Please mention temperature below which you would like to wear sweater, example 65';
    this.attributes[_STEP] = _ATTR_PREF_LOW_TEMP;
    this.emit(':ask', message, message);
  },
  'ResetIntent' : function() {
    console.log('reset', this.event);
    resetPreferences(this.attributes);
    this.emit('GetSuggestion');
  },
  'GetSuggestion' : function() {
    console.log('GetSuggestion', this.event);
    if (arePreferencesSet(this.attributes)) {
      var self = this;
      getSuggestion(this.attributes)
        .then(function(suggestion) {
            console.log('suggestion', suggestion, this.attributes);
            self.emit(':tell', suggestion);
          });
    } else {
      this.emit('GetZip');
    }
  },
  'AMAZON.HelpIntent' : function(){
    this.emit(':ask', helpMessage, helpMessage);
  },
  'Help' : function() {
    this.emit(':ask', helpMessage, helpMessage);
  },
  'AMAZON.YesIntent' : function() {
    // continue to GetSuggestion
    this.emit('GetSuggestion');
  },
  'AMAZON.StopIntent' : function() {
    this.emit(':tell','Goodbye!');
  },
  'AMAZON.CancelIntent' : function () {
    this.emit(':tell','Goodbye!');
  },
  'SessionEndedRequest': function () {
    this.emit(':saveState', true); // Be sure to call :saveState to persist your session attributes in DynamoDB
  },
  'Unhandled': function() {
    // check if base currency is set
    if (arePreferencesSet(this.attributes)) {
      // get suggestion
      this.emit('GetSuggestion');
    } else {
      // Read zip code
      this.emit('GetZip');
    }
  }
 };
exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = process.env.ALEXA_APP_ID;
    forecastServieAppId = process.env.FORCAST_APP_ID;
    alexa.dynamoDBTableName = 'alexaSkillDailyWear'; // That's it!
    alexa.registerHandlers(handlers);
    alexa.execute();
};
