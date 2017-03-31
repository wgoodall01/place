#!/usr/bin/env node
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database("place.sqlite3");
const schema = "CREATE TABLE IF NOT EXISTS place (y INTEGER, x INTEGER, color INTEGER, author STRING);";

function listenForMessages(){
	let sock = new WebSocket("wss://ws-0330dc1baef1afe1f.wss.redditmedia.com/place?m=AQAA6s7eWGEe24IIZkxUFRlPBhZDvrutpm__ZqyWkHciVeXRnNY3")
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
