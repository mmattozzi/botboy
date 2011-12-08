var sys = require('sys'),
    irc = require('irc'),
    repl = require('repl'),
    fs = require('fs'),
	addBehaviors = require('./behaviors'),
	addLivelockAnswerer = require('./livelock'),
	net = require('net');

function Botboy(properties) {
	this.client = null;
	this.options = {};
	this.messageListeners = [];
	this.mlIndex = {};
	this.lastMessage = "NONE";
	this.joined = false;
	this.server = properties.bot.server;
	
	this.connect = function() {
		sys.log("Creating new bot for channel " + properties.bot.channel);

        var bot = this;
        
		this.options = {
		    debug: true,
            showErrors: true,
            autoRejoin: true,
            autoConnect: false,
            password: properties.bot.password,
            channels: [ properties.bot.channel ],
		};
		
		if (properties.bot.userName) {
		    this.options.userName = properties.bot.userName;
		}
		
		if (properties.bot.realName) {
		    this.options.realName = properties.bot.realName;
		}
		
		this.client = new irc.Client(properties.bot.server, properties.bot.nick, this.options);

        this.client.addListener('message' + properties.bot.channel, function (from, message) {
            bot._onMessage(from, message);
        });
        
        this.client.on('registered', function() {
            sys.log("Connected to " + bot.server);
            bot.joined = true;
        });
        
        this.client.connect();
	};

    this.disconnect = function() {
        sys.log("Processing disconnect request");
        this.client.disconnect("410 Gone", function() {
            sys.log("Disconnected from irc");
        });
    };

	this.say = function(message) {
		if (this.joined) {
			this.client.say(this.options.channels[0], message);
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
	
	this._onMessage = function(nick, message) {
		for (var i = 0; i < this.messageListeners.length; i++) {
			var ml = this.messageListeners[i];
			if (ml.active && ! ml.func(nick, message)) {
				sys.log("Message served by: " + ml.name);
				break;
			}
		}
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

fs.writeFileSync('shutdown.sh', "#!/bin/bash" + "\n" + "kill " + process.pid + "\n");
fs.chmodSync('shutdown.sh', 33261);

var bot = new Botboy(properties);
addBehaviors(bot, properties);
addLivelockAnswerer(bot, properties);

var onKill = function() {
	try {
	    bot.disconnect();
    } catch (err1) { }
	try {
		fs.unlinkSync('shutdown.sh');
	} catch (err2) { }
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

if (properties.webrepl) {
	var wr = require('webrepl');
	var wrOpts = { 'username': properties.webrepl.username, 'password': properties.webrepl.password };
	wr.start(properties.webrepl.port, wrOpts).context.bot = bot;
}

// Given the shell argument, start up in a REPL
if (process.argv[2] && process.argv[2] === "shell") {
	repl.start('botboy> ').context.bot = bot;
}

// Use noconnect for testing
if (! process.argv[3] || process.argv[3] !== "noconnect") {
	bot.connect();
}
