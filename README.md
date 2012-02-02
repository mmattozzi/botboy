About
=================
Another chatbot, this one written in node.js. 

Requires
=================
node.js version >= 0.6.5  

Mysql database with the following table:

	CREATE TABLE `messages` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `nick` varchar(64) DEFAULT NULL,
	  `message` text,
	  `classification` varchar(16) DEFAULT NULL,
	  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	  PRIMARY KEY (`id`),
	  KEY `nick` (`nick`),
	  KEY `classification` (`classification`),
	  KEY `i_date` (`date`)
	)

Configure
=================
Download the dependencies by cd-ing into the botboy directory and running:

    npm install

* Copy bot.properties.sample to bot.properties
* Edit bot.properties to configure bot:
  * yahooId is optional, if present, yahoo answers API is used for some responses. 
  * replPort is optional, if present, a REPL socket will listen on the specified port

Run
=================
Easy start:

    ./startup.sh

This runs the bot through npm's start mechanism:

    npm start

To start up the bot normally:

    node botboy.js
    
To start up bot and leave a repl open (play with 'bot' variable):

    node botboy.js shell
    
Same as above, but don't connect to IRC. Use this to debug message handling:

    node botboy.js shell noconnect

Stop
=================

    ./shutdown.sh
    
The shutdown.sh file will be automatically created when the bot starts.
