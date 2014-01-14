var fs = require('fs');

function addFileBasedRandomAnswerer(bot, pattern, file) {
    
    var source = fs.readFileSync(file, 'utf8').split('\n');

    // Remove any empty entry caused by trailing newline
    if (source[source.length - 1] === '') {
    	source.pop();
    }
    
    bot.addMessageListener("random " + pattern, function(nick, message) {
		var re = new RegExp(pattern);
        if (re.test(message)) {
			bot.say(source[Math.floor(Math.random()*source.length)]);
			return false;
		}
		return true;
	});
    
}

module.exports = addFileBasedRandomAnswerer;
