var sys = require('sys');
var http = require('http');
var util = require('util');

function addRiverAnswerer(bot, properties, riverCode, command) {
    
    var url = 'http://water.weather.gov/ahps2/rss/obs/' + riverCode + '.rss';
    var commandRegex = new RegExp(command);

    util.log("Adding river query " + url);    
    bot.addCommandListener(command, commandRegex, "water level", function() {
        http.get(url, function(response) {
            var data = "";
            response.setEncoding('utf8');
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                var match = data.match(/Latest Observation: ([\d\.]+).*[\s\S]*Observation Time: (.*) E[S|D]T/);
                if (match) {
                    bot.say("As of " + match[2] + ", the river is at " + match[1] + " feet.");
                }
            });
        });
    });
    
}

module.exports = addRiverAnswerer;
