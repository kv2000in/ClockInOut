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
		 records.push({ name, clockInTime: time, assignment, action: 'clock-in' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock In recorded');
		 });

app.post('/clock-out', (req, res) => {
		 const { name, time, assignment } = req.body;
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({ name, clockOutTime: time, assignment, action: 'clock-out' });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock Out recorded');
		 });

app.get('/records', (req, res) => {
		const { start, end, name } = req.query;
		const records = JSON.parse(fs.readFileSync(recordsFile));
		
		// Filter records by date range and name
		const filteredRecords = [];
		records.forEach(record => {
						if (record.name === name) {
						if (record.clockInTime && record.clockOutTime) {
						const clockInTime = new Date(record.clockInTime);
						const clockOutTime = new Date(record.clockOutTime);
						if (clockInTime >= new Date(start) && clockOutTime <= new Date(end)) {
						filteredRecords.push({
											 name: record.name,
											 assignment: record.assignment,
											 clockInTime: record.clockInTime,
											 clockOutTime: record.clockOutTime,
											 timeAtWork: calculateTimeAtWork(clockInTime, clockOutTime)
											 });
						}
						}
						}
						});
		
		res.json(filteredRecords);
		});

function calculateTimeAtWork(clockInTime, clockOutTime) {
	const diff = (clockOutTime - clockInTime) / 1000; // difference in seconds
	const hours = Math.floor(diff / 3600);
	const minutes = Math.floor((diff % 3600) / 60);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

app.get('/index.html', (req, res) => {
		res.sendFile('index.html', { root: path.join(__dirname) });
		});

app.listen(3000, () => {
		   console.log('Server is running on port 3000');
		   });

