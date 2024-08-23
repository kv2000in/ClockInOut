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
		 const body = req.body;
		 const name = body.name;
		 const time = body.time;
		 const assignment = body.assignment;
		 
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({
					  name: name,
					  clockInTime: new Date(time).toISOString(),
					  assignment: assignment,
					  action: 'clock-in'
					  });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock In recorded');
		 });

app.post('/clock-out', (req, res) => {
		 const body = req.body;
		 const name = body.name;
		 const time = body.time;
		 const assignment = body.assignment;
		 
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 records.push({
					  name: name,
					  clockOutTime: new Date(time).toISOString(),
					  assignment: assignment,
					  action: 'clock-out'
					  });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock Out recorded');
		 });

app.get('/records', (req, res) => {
		const start = req.query.start;
		const end = req.query.end;
		const name = req.query.name;
		
		const records = JSON.parse(fs.readFileSync(recordsFile));
		
		// Convert to local date strings
		const startDate = new Date(start);
		const endDate = new Date(end);
		
		// Filter records by date range and name
		const filteredRecords = [];
		records.forEach(record => {
						if (record.name === name) {
						if (record.clockInTime && record.clockOutTime) {
						const clockInTime = new Date(record.clockInTime);
						const clockOutTime = new Date(record.clockOutTime);
						if (clockInTime >= startDate && clockOutTime <= endDate) {
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

