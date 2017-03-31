const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database("place.sqlite3");
const schema = "CREATE TABLE IF NOT EXISTS place (y INTEGER, x INTEGER, color INTEGER, author STRING);";

function listenForMessages(){
	let sock = new WebSocket("wss://ws-03b4e6be50118f83c.wss.redditmedia.com/place?m=AQAAqqbeWIAJRpBVybeEKvxIE6geiHX5NTcIYDOtwBGbMBKAka4T")
	const placeInsert = db.prepare("INSERT INTO place VALUES(?, ?, ?, ?);");
	sock.on("message", (dataStr, flags) => {
		data = JSON.parse(dataStr);
		const {payload, type} = data;


		switch(type){
			case "place":
				placeInsert.run(payload.x, payload.y, payload.color, payload.author);
				break;
			default:
				console.log("Unhandled message:");
				console.dir(payload);
		}
	})
}


// Run the schema, then start listening.
db.run(schema, listenForMessages);
