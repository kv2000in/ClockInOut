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
		 const { name, time, assignment } = req.body;
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({ name, time, assignment, action: 'clock-in' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock In recorded');
		 });

app.post('/clock-out', (req, res) => {
		 const { name, time, assignment } = req.body;
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({ name, time, assignment, action: 'clock-out' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock Out recorded');
		 });

app.get('/records', (req, res) => {
		const { start, end, name } = req.query;
		const records = JSON.parse(fs.readFileSync(recordsFile));
		
		// Filter records by date range and name
		const filteredRecords = records.filter(record => {
											   const recordTime = new Date(record.time);
											   return recordTime >= new Date(start) && recordTime <= new Date(end) && record.name === name;
											   });
		
		res.json(filteredRecords);
		});

app.get('/index.html', (req, res) => {
		res.sendFile('index.html', { root: path.join(__dirname) });
		});

app.listen(3000, () => {
		   console.log('Server is running on port 3000');
		   });

