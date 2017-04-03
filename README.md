<div align="center"><h1>place</h1></div>
<div align="center">Log pixels on <a href="http://www.reddit.com/r/place">/r/place</a></div>

## Setup
```bash
git clone https://github.com/wgoodall01/place.git
cd place
npm install
npm install -g pm2
pm2 start --name "place" index.js
```
It also works without pm2, but there are some fun metrics you would miss out on.

## What it does
1. Make a sqlite3 database with some tables and stuff
2. Connect to the /r/place websocket, log everything to the `place` table
3. Request the place bitmap every 60s, write that as a BLOB to the `bitmap` table


## Other stuff
Run `./export_csv.sh`, and assuming you have sqlite3 in your system path it will dump the whole `place` table into a `export-${timestamp}.csv`
