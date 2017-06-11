var expect = require('chai').expect;
var lambda = require('../index');
var forecast = require('../forecastService');

// const context = require('aws-lambda-mock-context');

describe("Testing a session with the AboutIntent", function() {
  it('Get forecast for 94089', function() {
    return forecast.get('94089').then(function(res){

      expect(res).not.to.be.null;
      expect(res.main.temp).not.to.be.null;
      // done();
    });
  });
});
