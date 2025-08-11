const CACHE_NAME = 'clock-in-out-tracker-cache-v1';
const urlsToCache = [
					 './',
					 './index.html',
					 './manifest.json',
					 './icons/icon-192x192.webp',
					 './icons/icon-512x512.webp',
					 './service-worker.js',
					 './icons/favicon.ico'
					 ];


self.addEventListener('install', (event) => {
					  event.waitUntil(
									  caches.open(CACHE_NAME)
									  .then((cache) => {
											return cache.addAll(urlsToCache);
											})
									  );
					  });


	// =========================
	// Utility: Fetch with timeout
	// =========================
function fetchWithTimeout(request, timeout) {
	return new Promise((resolve, reject) => {
					   const timer = setTimeout(() => {
												console.warn('Fetch timeout for', request.url);
												reject(new Error('timeout'));
												}, timeout);
					   
					   fetch(request)
					   .then(response => {
							 clearTimeout(timer);
							 resolve(response);
							 })
					   .catch(err => {
							  clearTimeout(timer);
							  reject(err);
							  });
					   });
}

	// =========================
	// Intercept fetch requests
	// =========================
self.addEventListener('fetch', event => {
					  const url = event.request.url;
					  
					  // 🗄 Special handling for DB sync endpoints
					  if (url.includes('upload_indexeddb_backup.php')) {
					  event.respondWith(
										fetchWithTimeout(event.request, 10000).catch(err => {
																					 console.warn('Backup upload failed, queuing for sync:', err);
																					 return queueBackupForSync(event.request);
																					 })
										);
					  return;
					  }
					  
					  if (url.includes('get_latest_backup.php')) {
					  event.respondWith(
										fetchWithTimeout(event.request, 10000).catch(err => {
																					 console.warn('Fetching latest backup failed:', err);
																					 return caches.match(event.request);
																					 })
										);
					  return;
					  }
					  
					  // 🌐 Normal requests: prefer network, fallback to cache
					  event.respondWith(
										caches.open('dynamic-cache').then(cache => {
																		  return fetchWithTimeout(event.request, 5000)
																		  .then(networkResponse => {
																				if (networkResponse && networkResponse.status === 200) {
																				cache.put(event.request, networkResponse.clone());
																				}
																				return networkResponse;
																				})
																		  .catch(err => {
																				 console.warn('Network fetch failed:', err);
																				 return caches.match(event.request)
																				 .then(cachedResponse => cachedResponse || Promise.reject('No cached version'));
																				 });
																		  })
										);
					  });

	// =========================
	// Queue backup for Background Sync
	// =========================
async function queueBackupForSync(request) {
	const db = await openBackupQueueDB();
	const cloned = await request.clone().text(); // get body contents
	const tx = db.transaction('backups', 'readwrite');
	tx.objectStore('backups').add({
								  body: cloned,
								  timestamp: Date.now()
								  });
	await tx.done;
	
		// Register a sync event
	self.registration.sync.register('sync-backups');
	
		// Return a fake "queued" response to the app
	return new Response(JSON.stringify({ queued: true }), {
						headers: { 'Content-Type': 'application/json' }
						});
}

	// =========================
	// IndexedDB for queued backups
	// =========================
function openBackupQueueDB() {
	return idb.openDB('backup-sync-db', 1, {
					  upgrade(db) {
					  if (!db.objectStoreNames.contains('backups')) {
					  db.createObjectStore('backups', { autoIncrement: true });
					  }
					  }
					  });
}

	// =========================
	// Handle Background Sync Event
	// =========================
self.addEventListener('sync', async event => {
					  if (event.tag === 'sync-backups') {
					  event.waitUntil(processBackupQueue());
					  }
					  });

async function processBackupQueue() {
	const db = await openBackupQueueDB();
	const tx = db.transaction('backups', 'readwrite');
	const store = tx.objectStore('backups');
	const allBackups = await store.getAll();
	
	for (let backup of allBackups) {
		try {
			const res = await fetch('/clock/upload_indexeddb_backup.php', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: backup.body
									});
			if (res.ok) {
					// Remove from queue after successful upload
				await store.delete(backup.id);
				console.log('Backup synced successfully');
			}
		} catch (err) {
			console.warn('Failed to sync backup, will retry later:', err);
		}
	}
	
	await tx.done;
}





self.addEventListener('activate', (event) => {
					  
					  const cacheWhitelist = [CACHE_NAME]; // Whitelist of caches to keep
					  
					  event.waitUntil(
									  // Combine both cache cleanup and claim into one Promise.all()
									  Promise.all([
												   caches.keys().then((cacheNames) => {
																	  return Promise.all(
																						 cacheNames.map((cacheName) => {
																										if (cacheWhitelist.indexOf(cacheName) === -1) {
																										return caches.delete(cacheName); // Delete caches not in the whitelist
																										}
																										})
																						 );
																	  }),
												   self.clients.claim() // Claim the clients immediately after activation
												   ])
									  );
					  });



const dbName = 'ClockInOutDB';
const calstoreName = 'calStore'; //calendar related items
const settingsstoreName = 'settingsStore';
let db;

function initDB() {
	const request = indexedDB.open(dbName, 2);
	//no existing database with the specified name), the onupgradeneeded event is triggered.
	//onupgradeneeded event is also triggered if you open a database with a version number higher than the currently existing database version
	request.onupgradeneeded = function(event) {
		db = event.target.result;
		let clockStore;
		if (!db.objectStoreNames.contains(clockstoreName)) {
			clockStore = db.createObjectStore(clockstoreName, {
											  keyPath: 'id',
											  autoIncrement: true
											  });
		} else {
			clockStore = request.transaction.objectStore(clockstoreName);
		}
		
			// Add the index on date and assignment
		if (!clockStore.indexNames.contains('date_index')) {
			
			clockStore.createIndex('date_index', ['date'], {
								   unique: false
								   })
		}
		if (!db.objectStoreNames.contains(settingsstoreName)) {
			db.createObjectStore(settingsstoreName, {
								 keyPath: 'id',
								 autoIncrement: true
								 });
		}
		
		if (!db.objectStoreNames.contains(calstoreName)) {
			db.createObjectStore(calstoreName, {
								 keyPath: 'id',
								 autoIncrement: true
								 });
		}
	};
	
	// initDB() will take it from here if database of the same version already exists.
	request.onsuccess = function(event) {
		db = event.target.result;
		loadQGendaURL();
	};
	
	request.onerror = function(event) {
		console.error('IndexedDB error:', event.target.errorCode);
	};
}

function getTransaction(storeName, mode) {
	//Check if dB is ready or initialized.
	if (db && db.objectStoreNames.contains([storeName])) {
		const transaction = db.transaction([storeName], mode);
	return transaction.objectStore(storeName);
	}
	else {console.log("getTransaction -db not ready or doesn't have requested store = "+storeName);}
}



self.addEventListener('message', function(event) {
					  if (event.data.action === 'skipWaiting') {
					  self.skipWaiting();  // Immediately activate the new service worker
					  };
					  const message = event.data;
					  
					  if (message.type === 'fetch-calendar') {
					  const url = message.data.url;
					  console.log("Fetching Cal as requested by main");
					  fetch(url)
					  .then(response => response.text())
					  .then(data => {
							// Process the data and store it as needed
							bgcalendarfetch(data);
							
							// Notify the main thread that the data is ready
							self.clients.matchAll().then(clients => {
														 clients.forEach(client => {
																		 client.postMessage({ type: 'fetch-complete', status: 'success' });
																		 });
														 });
							})
					  .catch(error => {
							 // Notify the main thread about the error
							 self.clients.matchAll().then(clients => {
														  clients.forEach(client => {
																		  client.postMessage({ type: 'fetch-complete', status: 'error', error: error.message });
																		  });
														  });
							 });
					  }
					  
					  if (message.type === 'database-ready') {
					  // Proceed with operations, knowing the database setup is complete
					  initDB();
					  console.log("DB ready as reported by main");
					  }
					  });



async function loadQGendaURL() {
	const store = getTransaction(calstoreName, 'readonly');
	const request = store.get('qgendaurl');
	request.onsuccess = function(event) {
		const result = event.target.result;
		if (result) {
			//fetch calendar if there is a stored value of calendar url
			fetch(result.value)
			.then(response => response.text())
			.then(data => {
				  // Process the data and store it as needed
				  bgcalendarfetch(data); 
				  
				  })			
			
			
		}
	};
}

function bgcalendarfetch(calendarData) {
	if (calendarData) {
		const events = parseICalendar(calendarData);
		const eventSummaryMap = new Map();  // To store date -> concatenated summaries
		
			// Process and store events in IndexedDB
		for (const event of events) {
			const eventDate = formatQDate(formatDateTime(new Date(parseCustomDate(event.details.date.replace(/\r$/, '')))));
			
			if (eventSummaryMap.has(eventDate)) {
					// If the date already exists, concatenate the summaries
				const currentSummary = eventSummaryMap.get(eventDate);
				eventSummaryMap.set(eventDate, currentSummary + ' / ' + event.details.summary);
			} else {
					// Otherwise, set the summary for the new date
				eventSummaryMap.set(eventDate, event.details.summary);
			}
		}
		
			// Store concatenated events in IndexedDB
		for (const [eventDate, summary] of eventSummaryMap) {
			storeAssignmentInDB(eventDate, summary);
		}
	}
}


async function fetchCalendar(url) {
	try {
		const response = await fetch(url);
		if (response.ok) {
			return await response.text();
		} else {
			console.error('Error fetching calendar:', response.statusText);
		}
	} catch (error) {
		console.error('Fetch error:', error);
	}
}

	// Function to store  assignment in IndexedDB
function storeAssignmentInDB(date, summary) {
	return new Promise((resolve, reject) => {
					   const store = getTransaction(calstoreName, 'readwrite');
					   const request = store.get(date);
					   
					   request.onsuccess = function(event) {
					   const result = event.target.result;
					   if (result) {
					   // There already exists an entry. Leave it untouched.
					   
					   } else {
					   // Store new assignment
					   store.put({ id: date, date: date, assignment: summary });
					   }
					   resolve();
					   };
					   
					   request.onerror = function(event) {
					   reject(event.target.error);
					   };
					   });
					  
					  
}


	// Function to update assignment in IndexedDB
function updateAssignmentInDB(date, summary) {
	return new Promise((resolve, reject) => {
					   const store = getTransaction(calstoreName, 'readwrite');
					   const request = store.get(date);
					   
					   request.onsuccess = function(event) {
					   const result = event.target.result;
					   if (result) {
					   // Concatenate new summary with existing assignment
					   const updatedAssignment = `${result.assignment} ${summary}`;
					   store.put({ id: date, date: date, assignment: updatedAssignment });
					   } else {
					   // Store new assignment
					   store.put({ id: date, date: date, assignment: summary });
					   }
					   resolve();
					   };
					   
					   request.onerror = function(event) {
					   reject(event.target.error);
					   };
					   });
}

	// Function to get an assignment from IndexedDB
function getAssignmentFromDB(date) {
	return new Promise((resolve, reject) => {
					   const store = getTransaction(calstoreName, 'readonly');
					   const request = store.get(date);
					   
					   request.onsuccess = function(event) {
					   resolve(event.target.result);
					   };
					   
					   request.onerror = function(event) {
					   reject(event.target.error);
					   };
					   });
	}
function parseICalendar(data) {
	const events = [];
	const lines = data.split('\n');
	let event = null;
	
	for (const line of lines) {
		if (line.startsWith('BEGIN:VEVENT')) {
			event = {
			details: {}
			};
		} else if (line.startsWith('SUMMARY:')) {
			event.details.summary = line.replace('SUMMARY:', '').trim();
		} else if (line.startsWith('DTSTART;VALUE=DATE:')) {
			event.details.date = line.replace('DTSTART;VALUE=DATE:', '').trim();
		} else if (line.startsWith('DTSTART:')) {
				// Extract date part from the format like "20240703T110000Z"
			const dateTime = line.replace('DTSTART:', '').trim();
			event.details.date = dateTime.substring(0, 8);  // Extract just the date part: YYYYMMDD
		} else if (line.startsWith('END:VEVENT')) {
			if (event) {
				events.push(event);
				event = null;
			}
		}
	}
	
	return events;
}


function formatQDate(date) {
	return date.split('T')[0];
	}

function formatDateTime(inputDateTime) {
	const date = new Date(inputDateTime);
	const pad = (num, size) => num.toString().padStart(size, '0');
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1, 2);
	const day = pad(date.getDate(), 2);
	const hours = pad(date.getHours(), 2);
	const minutes = pad(date.getMinutes(), 2);
	const seconds = pad(date.getSeconds(), 2);
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	}

function parseCustomDate(dateString) {
	const year = dateString.slice(0, 4);
	const month = dateString.slice(4, 6) - 1; // Months are 0-indexed in JavaScript
	const day = dateString.slice(6, 8);
	
	return new Date(year, month, day);
	}
