#!/usr/bin/env node
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();
const getUrl = require("./getUrl");
const request = require("request");
const pmx = require("pmx");

const probe = pmx.probe();
const placeMeter = probe.meter({name:"Place/sec", samples:1});
const dbMeter = probe.meter({name: "DB inserts/sec", samples:1});
const otherMeter = probe.meter({name:"Other events/sec", samples:1});

let db = new sqlite3.Database("place.sqlite3");

const sql_place = `INSERT INTO place(x,y,color,author) VALUES (?,?,?,?);`;
const sql_count = `INSERT INTO count(count) VALUES (?);`;
const sql_other = `INSERT INTO other(json) VALUES (?);`;
const sql_bitmap = `INSERT INTO bitmap(bitmap) VALUES (?);`;

var placeInsert = null;
var countInsert = null;
var otherInsert = null;
var bitmapInsert = null;
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

	db.run(`
		CREATE TABLE IF NOT EXISTS bitmap(
			id INTEGER NOT NULL PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			bitmap BLOB
		);
	`)
	
	otherInsert = db.prepare(sql_other)
	bitmapInsert = db.prepare(sql_bitmap)
	countInsert = db.prepare(sql_count)
	placeInsert = db.prepare(sql_place)
	db.parallelize(cb);
}


let placeInsertBuffer = [];

function writePlaceToDB(){
	db.serialize();
	db.run("BEGIN TRANSACTION;");
	
	for(var i = 0; i<placeInsertBuffer.length; i++){
		let pix = placeInsertBuffer[i];
		placeInsert.run(
			pix.x, 
			pix.y, 
			pix.color, 
			pix.author, 
			(err)=>{
				if(err){console.log(err);}
				else{dbMeter.mark();}
			}
		);
	}

	db.run("COMMIT;");
	db.parallelize();
	placeInsertBuffer = [];
}


function handleSocketMessage(dataStr, flags){
	data = JSON.parse(dataStr);
	const {payload, type} = data;

	switch(type){
		case "batch-place":
		case "place":
			placeMeter.mark();
			let pixels = payload instanceof Array? payload : [payload]
			Array.prototype.push.apply(placeInsertBuffer, pixels);
			break;
		case "activity":
			otherMeter.mark();
			countInsert.run(payload.count, (err)=>{if(err){console.log(err);}});
			break;
		default:
			otherMeter.mark();
			otherInsert.run(JSON.stringify(payload), (err)=>{if(err){console.log(err);}});
			console.log(`Unknown message (type="${type}"):`);
			console.dir(payload);
	}
}

function fetchBitmap(cb){
	console.log("Fetching bitmap...");
	request({
		method:"GET",
		url:"https://www.reddit.com/api/place/board-bitmap?robot=github-wgoodall01-place",
		encoding:null,
	}, function(err, resp, body){
		if(err){console.log(err); return;}
		bitmapInsert.run(
			body, 
			(err)=>{
				if(err){console.log(err);}
				else{
					console.log("Bitmap fetched.")
				};
			}
		);
	})
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

// Fetch the bitmap every min.
fetchBitmap();
setInterval(fetchBitmap, 1000 * 60);

// Write buf to DB every second.
setInterval(writePlaceToDB, 1000 * 1);
