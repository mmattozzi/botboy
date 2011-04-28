var sys = require('sys'),
    MongoBot = require('./MongoBot'),
    MysqlBot = require('./MysqlBot');

function Persistence(properties) {
    
    var persistBots = [];
    var self = this;
    
    if (properties.mysql) {
        persistBots.push(new MysqlBot().init(properties, true));
    }
    
    if (properties.mongodb) {
        persistBots.push(new MongoBot().init(properties, (properties.mysql == null)));
    }
    
    this.isActive = function() {
        return (persistBots.length > 0);
    };
    
    this.saveMessage = function(nick, message) {
        persistBots.forEach(function(b) {
            b.saveMessage(nick, message);
        });
    };
    
    this.getRandom = function(bot) {
        persistBots.forEach(function(b) {
            b.getRandom(bot);
        });
    };
    
    this.getQuote = function(nick, bot) {
        persistBots.forEach(function(b) {
            b.getQuote(nick, bot);
        });
    };
    
    this.getMessage = function(msgId, bot) {
        persistBots.forEach(function(b) {
            b.getMessage(msgId, bot);
        });
    };
    
    this.matchMessage = function(str, bot) {
        persistBots.forEach(function(b) {
            b.matchMessage(str, bot);
        });
    };
    
    this.matchMessageForNick = function(nick, str, bot) {
        persistBots.forEach(function(b) {
            b.matchMessageForNick(nick, str, bot);
        });
    };
}

module.exports = Persistence;

