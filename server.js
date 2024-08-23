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
		 // Check if there is already a clock-in record without a clock-out
		 let existingRecord = records.find(record => record.name === name && !record.clockOutTime);
		 
		 if (existingRecord) {
		 res.status(400).send('Already clocked in.');
		 return;
		 }
		 
		 records.push({
					  name: name,
					  clockInTime: new Date(time).toISOString(),
					  assignment: assignment
					  });
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock In recorded');
		 });

app.post('/clock-out', (req, res) => {
		 const body = req.body;
		 const name = body.name;
		 const time = body.time;
		 
		 const records = JSON.parse(fs.readFileSync(recordsFile));
		 // Find the matching clock-in record
		 let existingRecord = records.find(record => record.name === name && !record.clockOutTime);
		 
		 if (!existingRecord) {
		 res.status(400).send('No clock-in record found.');
		 return;
		 }
		 
		 existingRecord.clockOutTime = new Date(time).toISOString();
		 fs.writeFileSync(recordsFile, JSON.stringify(records));
		 res.send('Clock Out recorded');
		 });

app.get('/records', (req, res) => {
		const query = req.query;
		const start = query.start;
		const end = query.end;
		const name = query.name;
		const exportCSV = query.exportCSV;
		
		const records = JSON.parse(fs.readFileSync(recordsFile));
		
		// Convert to local date strings
		const startDate = new Date(start);
		const endDate = new Date(end);
		
		// Filter records by date range and name
		const filteredRecords = [];
		records.forEach(function(record) {
						if (record.name === name && record.clockInTime && record.clockOutTime) {
						const clockInTime = new Date(record.clockInTime);
						const clockOutTime = new Date(record.clockOutTime);
						if (clockInTime >= startDate && clockOutTime <= endDate) {
						filteredRecords.push({
											 name: record.name,
											 assignment: record.assignment,
											 clockInTime: clockInTime.toLocaleString(),
											 clockOutTime: clockOutTime.toLocaleString(),
											 timeAtWork: calculateTimeAtWork(clockInTime, clockOutTime)
											 });
						}
						}
						});
		
		if (filteredRecords.length === 0) {
		// No records found
		res.status(404).send('No data exists for the name and time period selected.');
		return;
		}
		
		if (exportCSV === 'true') {
		// Generate CSV content
		const csvHeaders = ['Name', 'Assignment', 'Clock-in Time', 'Clock-out Time', 'Time at Work'];
		const csvRows = [csvHeaders.join(',')];
		
		filteredRecords.forEach(function(record) {
								const row = [
											 `"${record.name}"`,
											 `"${record.assignment}"`,
											 `"${record.clockInTime}"`,
											 `"${record.clockOutTime}"`,
											 `"${record.timeAtWork}"`
											 ];
								csvRows.push(row.join(','));
								});
		
		const csvContent = csvRows.join('\n');
		
		// Set headers for CSV file download
		res.header('Content-Type', 'text/csv');
		res.header('Content-Disposition', `attachment; filename="records_${formatDate(startDate)}_${formatDate(endDate)}.csv"`);
		res.send(csvContent);
		} else {
		res.json(filteredRecords);
		}
		});

function calculateTimeAtWork(clockInTime, clockOutTime) {
	const diff = (clockOutTime - clockInTime) / 1000; // difference in seconds
	const hours = Math.floor(diff / 3600);
	const minutes = Math.floor((diff % 3600) / 60);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDate(date) {
	return date.toISOString().split('T')[0].replace(/-/g, '');
}

app.get('/index.html', (req, res) => {
		res.sendFile('index.html', { root: path.join(__dirname) });
		});

app.listen(3000, () => {
		   console.log('Server is running on port 3000');
		   });

