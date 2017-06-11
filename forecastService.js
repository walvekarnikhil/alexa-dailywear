'use strict';
var http   = require('http');
var Q = require('q');

var forecastService = function() {
  return {
    get: function(zip,appid) {
      var url = 'http://api.openweathermap.org/data/2.5/weather?zip=' + zip +',us&units=imperial&appid=' + appid;
      // var req = request(url);
      var deferred = Q.defer();
      http.get(url, function(response) {
        if (response.statusCode != 200) {
          deferred.reject({ status: response.statusCode, message: response.statusMessage});
        }
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;

        });
        response.on('end', function() {
            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            deferred.resolve(parsed);
        });
      }, function(err){
        console.log(err);
      })
      return deferred.promise;
    }
  }
}();

module.exports = forecastService;
