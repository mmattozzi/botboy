var querystring = require('querystring'),
    digest = require('./lib/digest/digest'),
    sys = require('sys');

function addLivelockAnswerer(bot, properties) {
	
	var digestClient = digest.createClient(80, "antonym.subterfusion.net", "mmattozzi", ".Candidat3");
	
	var livelockQuery = function (msg, tries) {
		if (tries > 1) {
			return;
		}
		
		var reqPath = "/api/public/mixtures?q=" + querystring.escape(msg);
		sys.log("Livelock request: " + reqPath + " TRIES = " + tries);
		var req = digestClient.request("GET", reqPath, { host: "antonym.subterfusion.net" });
		var data = "";
		req.addListener("response", function(response) {
			response.setEncoding('utf8');
			sys.log(response.statusCode);
			response.addListener('data', function(chunk) {
				data += chunk;
			});
			response.addListener('end', function() {
				if (response.statusCode === 200) {
					var livelockRes = JSON.parse(data);
					bot.say(livelockRes.body);
				} else if (response.statusCode === 408 && tries < 2) {
					livelockQuery(msg, ++tries);
				} else {
					bot.say("livelock fail: HTTP " + response.statusCode);
				}
			});
		});
	};
	
	bot.addMessageListener("livelock", function(nick, message) {
		var check = message.match(/!livelock(.*)/);
		if (check) {
			var msg = check[1];
			livelockQuery(msg, 0);
			return false;
		}
		return true;
	});

}

module.exports = addLivelockAnswerer;