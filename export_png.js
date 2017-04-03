#!/usr/bin/env node

// Heavily inspired by 
// https://github.com/PlaceDevs/place-gifs/blob/master/raw-bitmap-png.py

const sqlite3 = require("sqlite3");
const PNG = require("pngjs").PNG;
const split = require("split");
const fs = require("fs");

const HEADER_SIZE=4;
const WIDTH=1000;
const HEIGHT=1000;

const db = new sqlite3.Database("place.sqlite3");
const getById = db.prepare("SELECT * FROM bitmap WHERE id==?;");

const colors = [
    [0xff, 0xff, 0xff], // #FFFFFF
    [0xe4, 0xe4, 0xe4], // #E4E4E4
    [0x88, 0x88, 0x88], // #888888
    [0x22, 0x22, 0x22], // #222222
    [0xff, 0xa7, 0xd1], // #FFA7D1
    [0xe5, 0x00, 0x00], // #E50000
    [0xe5, 0x95, 0x00], // #E59500
    [0xa0, 0x6a, 0x42], // #A06A42
    [0xe5, 0xd9, 0x00], // #E5D900
    [0x94, 0xe0, 0x44], // #94E044
    [0x02, 0xbe, 0x01], // #02BE01
    [0x00, 0xd3, 0xdd], // #00D3DD
    [0x00, 0x83, 0xc7], // #0083C7
    [0x00, 0x00, 0xea], // #0000EA
    [0xcf, 0x6e, 0xe4], // #CF6EE4
    [0x82, 0x00, 0x80]  // #820080
];

function setPixel(buf, x, y, color){
	const loc = (WIDTH * y + x) << 2;
	buf[loc]   = color[0]; // Red
	buf[loc+1] = color[1]; // Green
	buf[loc+2] = color[2]; // Blue
	buf[loc+3] = 0xFF
}

function saveFromDB(id){
	getById.get(id, (err, record) => {
		if(err){
			console.error(err);
		}else{

			const buf = record.bitmap.slice(HEADER_SIZE);
			// Create img buffer with no alpha channel
			let img = new PNG({width:WIDTH, height:HEIGHT, colorType:2});

			for(var i = 0; i<buf.length; i++){
				const byte = buf[i];
				
				const x1 = (i * 2) % WIDTH
				const x2 = (x1 + 1) % WIDTH
				const y1 = Math.min(Math.floor((i * 2) / WIDTH), HEIGHT-1);
				const y2 = (x1 + 1) > (WIDTH - 1) ? y1 + 1 : y1
				
				const color1 = colors[byte >> 4];
				const color2 = colors[byte & 0x0F];

				setPixel(img.data, x1, y1, color1);
				setPixel(img.data, x2, y2, color2);
			}
			const filename = ("./png_export/" + record.timestamp + ".png")
				.replace(/\ /g, "--")
				.replace(/\:/g, "-");
			const fStream = img
				.pack()
				.pipe(fs.createWriteStream(filename));
			fStream.on("finish", ()=>console.log(filename));
		}
	});
}

function processLine(line){
	const id = parseInt(line.trim());
	if(line == ""){
		// Do nothing, ignore empty lines
	}else if(("" + id) !== line){
		console.error(`Error: line "${line}" cannot be parsed to an int.`);
	}else{
		saveFromDB(id);
	}
}

try {fs.mkdirSync("png_export");} catch(err){
	if(err.code !== "EEXIST") throw err;
}
process.stdin
	.pipe(split())
	.on("data", processLine);


