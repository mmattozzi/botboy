var sys = require('sys'),
    IRC = require('./lib/irc-js/irc'),
    repl = require('repl'),
    fs = require('fs'),
	addBehaviors = require('./behaviors'),
	addLivelockAnswerer = require('./livelock'),
	net = require('net');

function Botboy(options, channel) {
	this.client = null;
	this.options = options;
	this.channel = channel;
	this.messageListeners = [];
	this.mlIndex = {};
	this.joined = false;
	this.lastMessage = "NONE";
	
	this.connect = function() {
		sys.log("Creating new bot for channel " + this.channel);
		this.options.bot = this;
		this.client = new IRC(this.options || {});

		// Add listeners for IRC messages. Inside the listener function
		// this refers to the IRC object, not Botboy 
		this.client.addListener('mode', function(message) {
			this.options.bot._onModeMessage(message);
		});
		this.client.addListener('privmsg', function(message) {
			this.options.bot._onPrivMessage(message);
		});

		this.client.connect();
	};

	this.join = function() {
		sys.log("Joining channel " + this.channel);
		this.client.join(this.channel);
		this.joined = true;
	};

	this.disconnect = function() {
		if (this.joined) {
			this.client.disconnect();
			this.joined = false;
		}
	};
	
	this.say = function(message) {
		if (this.joined) {
			this.client.privmsg(this.channel, message);
		} else {
			sys.log(message);
		}
		this.lastMessage = message;
	};
	
	/**
     * name - name of behavior
     * func - function to respond to message from irc. This function should
     *        take two params (nick, message) and return false if processing 
     *        should cease, and true if processing should continue	
     */
	this.addMessageListener = function(name, func) {
		var obj = {};
		obj.name = name;
		obj.func = func;
		obj.active = true;
		this.messageListeners.push(obj);
		this.mlIndex[name] = obj;
	};
	
	this.toggleMessageListener = function(name) {
		if (this.mlIndex[name]) {
			if (this.mlIndex[name].active) {
				this.mlIndex[name].active = false;
			}
			else {
				this.mlIndex[name].active = true;
			}
		}
		return this.mlIndex[name].active;
	};
	
	this._onPrivMessage = function(message) {
		sys.log("Got priv message: " + sys.inspect(message) );
		if (message.params[0] === this.channel) {
			this._onMessage(message.person.nick, message.params[1]);
		}
	};

	this._onMessage = function(nick, message) {
		for (var i = 0; i < this.messageListeners.length; i++) {
			var ml = this.messageListeners[i];
			if (ml.active && ! ml.func(nick, message)) {
				sys.log("Message served by: " + ml.name);
				break;
			}
		}
	};

	this._onModeMessage = function(message) {
		sys.log("Got mode message!!" + sys.inspect(message) );
		this.options.bot.join();
	};
}

try {
	var properties = JSON.parse(fs.readFileSync("bot.properties"));
} catch (err) {
	sys.log("Missing or corrupt bot.properties file in base directory?");
	throw err;
}

if (! properties.bot.nick) {
	sys.log("Missing property information. Fill in bot.properties to get started!");
	process.exit(1);
}

var options = { 
	server: properties.bot.server, 
	nick: properties.bot.nick, 
	user: {
		username: properties.bot.nick, 
		realname: properties.bot.nick, 
		nickname: properties.bot.nick
	}
};

fs.writeFileSync('shutdown.sh', "#!/bin/bash" + "\n" + "kill " + process.pid + "\n");
fs.chmodSync('shutdown.sh', 33261);

var bot = new Botboy(options, properties.bot.channel);
addBehaviors(bot, properties);
addLivelockAnswerer(bot, properties);

var onKill = function() {
	bot.disconnect();
	try {
		fs.unlinkSync('shutdown.sh');
	} catch (err) { }
	process.exit();
};

process.on('SIGINT', function() {
	sys.log("Got SIGINT, disconnecting bot.");
	onKill();
});

process.on('SIGTERM', function() {
	sys.log("Got SIGINT, disconnecting bot.");
	onKill();
});

process.on('uncaughtException', function (err) {
    sys.log('Caught exception: ' + err);
});

if (properties.replPort) {
	sys.log("Starting remote REPL on port " + properties.replPort);
	net.createServer(function (socket) {
		repl.start("botboy via TCP socket> ", socket).context.bot = bot;
	}).listen(properties.replPort);
}

// Given the shell argument, start up in a REPL
if (process.argv[2] && process.argv[2] === "shell") {
	repl.start('botboy> ').context.bot = bot;
}

// Use noconnect for testing
if (! process.argv[3] || process.argv[3] !== "noconnect") {
	bot.connect();
}
