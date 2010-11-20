var sys = require('sys'), 
    child_process = require('child_process'),
    Script = process.binding('evals').Script,
    MySQLClient = require('./MysqlWrapper'),
    http = require('http'),
    querystring = require('querystring');

function addBehaviors(bot, properties) {
	
	var options = properties.mysql;
	var mysql = new MySQLClient(options);
	mysql.connect();
	
	var userEval = 1;
	var yahooClient = http.createClient(80, 'answers.yahooapis.com');
	
	// Rate to mix in yahoo answers with stored responses
	// 0.75 = 75% Yahoo answers, 25% stored responses
	var mix = 0.5;
	
	bot.addMessageListener("logger", function(nick, message) {
		// Check to see if this is from a nick we shouldn't log
		if (properties.mysql.logger.ignoreNicks.filter(function (x) { return nick.indexOf(x) > -1; }).length > 0) {
			return true;
		}
		if (! (/^!/).test(message)) {
			mysql.query("INSERT INTO messages (nick, message) VALUES (?, ?)", [nick, message]);
		}
		return true;
	});

	var mysqlRandom = function() {
		mysql.query("select * from messages where length(message) > 20 order by rand() limit 1", function(err, results, fields) {
			if (err) {
				sys.log("Error: " + err);
			}
			if (results.length > 0) {
				bot.say(results[0].message);
			}
		});
	};

	var yahooAnswer = function(message) {
		var url = '/AnswersService/V1/questionSearch?appid=' + properties.yahooId + 
			"&query=" + querystring.escape(message) + "&type=resolved&output=json";
		sys.log("Calling " + url);
		var request = yahooClient.request('GET', url, { host: 'answers.yahoo.com' });
		request.end();
		var data = '';
		request.on('response', function(response) {
			response.setEncoding('utf8');
			response.on('data', function(chunk) {
				data += chunk;
			});
			response.on('end', function() {
				try {
					var yahooResponse = JSON.parse(data);
					if (yahooResponse.all.count > 0) {
						var bestAnswer = yahooResponse.all.questions[0].ChosenAnswer;
						bestAnswer = bestAnswer.substring(0, 400);
						bot.say(bestAnswer);
					} else {
						mysqlRandom();
					}
				} catch (err) {
					sys.log(err);
					mysqlRandom();
				}
			});
		});
	};

	bot.addMessageListener("listen for name", function (nick, message) {
		var re = new RegExp(properties.bot.nick);
		if (re.test(message)) {
			if (Math.random() < mix && properties.yahooId) {
				sys.log("mix = " + mix + ", serving from yahoo answers");
				yahooAnswer(message.replace(re, ''));
			} else {
				sys.log("mix = " + mix + ", serving from mysql");
				mysqlRandom();
			}
			return false;
		} else {
			return true;
		}
	});

	bot.addMessageListener("adjust mix", function (nick, message) {
		var test = message.match(/!mix ([0-9]*\.[0-9]+)/);
		if (test) {
			mix = test[1];
			bot.say("Set mix to " + mix + " rate of yahoo answers.");
			return false;
		}
		return true;
	});

	bot.addMessageListener("quoter", function (nick, message) {
		var check = message.match(/!do ([0-9A-Za-z_\-]*)/);
		if (check) {
			var doNick = check[1];
			mysql.query("select * from messages where nick like '" + doNick + "' order by rand() limit 1", function(err, results, fields) {
				if (err) {
					sys.log("Error: " + err);
				}
				if (results.length > 0) {
					bot.say('#' + results[0].id + " " + results[0].message);
				}
			});
			return false;
		} else {
			return true;
		}
	});

	bot.addMessageListener("message recall", function (nick, message) {
		var check = message.match(/!msg ([0-9]*)/);
		if (check) {
			var id = check[1];
			mysql.query("select * from messages where id = " + id, function(err, results, fields) {
				if (err) {
					sys.log("Error: " + err);
				}
				if (results.length > 0) {
					bot.say('#' + results[0].id + " " + results[0].message);
				}
			});
			return false;
		} else {
			return true;
		}
	});

	bot.addMessageListener("uname", function (nick, message) {
		if (message === "!uname") {
			child_process.exec('uname -a', function(error, stdout, stderr) {
				bot.say(stdout);
			});
			return false;
		}
		return true;
	});

	bot.addMessageListener("toggle", function(nick, message) {
		var check = message.match(/!toggle (.*)/);
		if (check) {
			var name = check[1];
			var result = bot.toggleMessageListener(name);
			if (result) {
				bot.say("Message listener " + name + " is active");
			} else {
				bot.say("Message listener " + name + " is inactive");
			}
			return false;
		}
		return true;
	});

	bot.addMessageListener("eval", function(nick, message) {
		var check = message.match(/!add (.*)/);
		if (check) {
			var msg = check[1];
			var mlName = "user eval " + userEval++;
			bot.addMessageListener(mlName, function(nick, message) {
				var sandbox = { output: null, nick: nick, message: message };
				Script.runInNewContext(msg, sandbox);
				if (sandbox.output) {
					bot.say(sandbox.output);
					return false;
				}
				return true;
			});
			bot.say("Added message listener: " + mlName);
			return false;
		}
		return true;
	});
		
}

module.exports = addBehaviors;