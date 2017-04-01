#!/usr/bin/env node
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const getUrl = require("./getUrl");

let db = new sqlite3.Database("place.sqlite3");

const sql_place = `INSERT INTO place(x,y,color,author) VALUES (?,?,?,?);`;
const sql_count = `INSERT INTO count(count) VALUES (?);`;
const sql_other = `INSERT INTO other(json) VALUES (?);`

var placeInsert = null;
var countInsert = null;
var otherInsert = null;
function dbSetup(cb){
	db.serialize();
	db.run(`
		PRAGMA journal_mode=WAL;
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS place (
			id INTEGER NOT NULL PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			y INTEGER,
			x INTEGER,
			color INTEGER,
			author STRING
		);
	`);
	
	db.run(`
		CREATE TABLE IF NOT EXISTS count (
			id INTEGER NOT NULL PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			count INTEGER
		);
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS other(
			id INTEGER NOT NULL PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			json STRING
		);
	`);
	
	let prepOther = () => {otherInsert = db.prepare(sql_other, cb);};
	let prepCount = () => {countInsert = db.prepare(sql_count, prepOther)};
	let prepPlace = () => {placeInsert = db.prepare(sql_place, prepCount)};
	db.parallelize(prepPlace);
}


function handleSocketMessage(dataStr, flags){
	data = JSON.parse(dataStr);
	const {payload, type} = data;

	switch(type){
		case "batch-place":
		case "place":
			let pixels = payload instanceof Array? payload : [payload]

			for(var i = 0; i<pixels.length; i++){
				let pix = pixels[i];
				placeInsert.run(
					pix.x, 
					pix.y, 
					pix.color, 
					pix.author, 
					(err)=>{if(err){console.log(err);}}
				);
			}

			break;
		case "activity":
			countInsert.run(payload.count, (err)=>{if(err){console.log(err);}});
		default:
			otherInsert.run(JSON.stringify(payload), (err)=>{if(err){console.log(err);}});
			console.log(`Unknown message (type="${type}"):`);
			console.dir(payload);
	}
}

function connectToSocket(url){
	let sock = new WebSocket(url);
	sock.on("open", ()=>{console.log("Connected.")});
	sock.on("message", handleSocketMessage);
	sock.on("close", ()=>{
		console.log("Connection lost.");
		start();
	}); // Handle reconnect on close
}

function start(){
	console.log("Connecting...");
	getUrl(url => connectToSocket(url));
}

// Run the schema, then start listening.

dbSetup(start);
