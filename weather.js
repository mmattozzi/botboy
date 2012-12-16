var sys = require('sys');
var http = require('http');
var util = require('util');

function addWeatherAnswerer(bot, properties, wundergroundApiKey) {
    
    bot.addCommandListener("!weather [city], [state]", /!weather (.*)/, "weather for state / city", function(stateCity) {
        var match = stateCity.match(/([A-Za-z ]*), ([A-Za-z]{2})/);
        if (match) {
            var state = match[2];
            var city = match[1];
            var url = 'http://api.wunderground.com/api/' +  wundergroundApiKey + '/conditions/q/' + 
                state + '/' + city + '.json';
        
            http.get(url, function(response) {
                var data = "";
                response.setEncoding('utf8');
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    var weather = JSON.parse(data);
                    bot.say(weather.current_observation.weather + " and " + weather.current_observation.temp_f +
                        " degrees, with wind " + weather.current_observation.wind_string);                    
                });
            });
        }
    });
    
}

module.exports = addWeatherAnswerer;
