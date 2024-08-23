const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const recordsFile = 'records.json';

	// Initialize records file if it doesn't exist
if (!fs.existsSync(recordsFile)) {
	fs.writeFileSync(recordsFile, JSON.stringify([]));
}

app.post('/clock-in', (req, res) => {
		 const name = req.body.name;
		 const time = req.body.time;
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({ name: name, time: time, action: 'clock-in' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock In recorded');
		 });

app.post('/clock-out', (req, res) => {
		 const name = req.body.name;
		 const time = req.body.time;
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({ name: name, time: time, action: 'clock-out' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock Out recorded');
		 });

app.get('/records', (req, res) => {
		const records = JSON.parse(fs.readFileSync(recordsFile));
		res.json(records);
		});
app.get('/index.html', (req, res) => {
		res.sendFile('index.html')
		});

app.listen(3000, () => {
		   console.log('Server is running on port 3000');
		   });
