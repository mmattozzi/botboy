var fs = require('fs');

function addFileBasedRandomAnswerer(bot, pattern, file) {
    
    var macesResponses = fs.readFileSync(file, 'utf8').split('\n');
    
    bot.addMessageListener("random " + pattern, function(nick, message) {
		var re = new RegExp(pattern);
        if (re.test(message)) {
			bot.say(macesResponses[Math.floor(Math.random()*macesResponses.length)]);
			return false;
		}
		return true;
	});
    
}

module.exports = addFileBasedRandomAnswerer;
