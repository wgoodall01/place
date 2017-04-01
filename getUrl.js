const request = require("request");

const URL = "https://www.reddit.com/r/place";
const WS_URL_MATCH = /\"place_websocket_url\":\ \"(.*?)\"\,/;

module.exports = function(cb){
	request(URL, function(err, res, body){
		if(err){reject(err); return;}
		if(res.statusCode != 200){reject(new Error("Response not 200")); return;}

		var regexMatch = body.match(WS_URL_MATCH);
		cb(regexMatch[1] + "&robot=github-wgoodall01-place");
	})
}


