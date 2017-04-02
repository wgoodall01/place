const request = require("request");

const URL = "https://www.reddit.com/r/place";
const WS_URL_MATCH = /\"place_websocket_url\":\ \"(.*?)\"\,/;

module.exports = function(cb){
	request(URL, function(err, res, body){
		if(err){reject(err); return;}
		if(res.statusCode != 200){cb(new Error("Response not 200"), null); return}

		var regexMatch = body.match(WS_URL_MATCH);

		if(regexMatch == null){cb(new Error("Couldn't find WS URL"), null); return;}
		cb(null, regexMatch[1] + "&robot=github-wgoodall01-place");
	})
}


