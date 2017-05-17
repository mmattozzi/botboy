var sys = require('sys');
var http = require('http');
var util = require('util');

function addRiverAnswerer(bot, properties, riverCode, command) {
    
    var url = 'http://water.weather.gov/ahps2/hydrograph_to_xml.php?gage=' + riverCode + '&output=xml';
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
                var match = data.match(/<valid timezone="UTC">2017-05-17T(\d\d:\d\d:\d\d)-00:00<\/valid><primary name="Stage" units="ft">(\d+\.\d+)<\/primary>/);
                if (match) {
                    bot.say("As of " + match[1] + " UTC, the river is at " + match[2] + " feet.");
                }
            });
        });
    });
    
}

module.exports = addRiverAnswerer;
