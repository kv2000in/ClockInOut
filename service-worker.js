const CACHE_NAME = 'clock-in-out-tracker-cache-v1';
const urlsToCache = [
					 './',
					 './index.html',
					 './manifest.json',
					 './icons/icon-192x192.webp',
					 './icons/icon-512x512.webp',
					 './service-worker.js'
					 ];

const myurl = "/clock/qgenda/";
self.addEventListener('install', (event) => {
					  event.waitUntil(
									  caches.open(CACHE_NAME)
									  .then((cache) => {
											return cache.addAll(urlsToCache);
											})
									  );
					  });

self.addEventListener('fetch', (event) => {
					  event.respondWith(
										caches.match(event.request)
										.then((response) => {
											  if (response) {
											  return response;
											  }
											  return fetch(event.request);
											  })
										);
					  });

self.addEventListener('activate', (event) => {
					  await loadQGendaURL();
					  bgcalendarfetch(myurl);
					  const cacheWhitelist = [CACHE_NAME];
					  
					  event.waitUntil(
									  caches.keys().then((cacheNames) => {
														 return Promise.all(
																			cacheNames.map((cacheName) => {
																						   if (cacheWhitelist.indexOf(cacheName) === -1) {
																						   return caches.delete(cacheName);
																						   }
																						   })
																			);
														 })
									  );
					  });


const dbName = 'ClockInOutDB';
const storeName = 'recordsStore';
let db;

function initDB() {
	const request = indexedDB.open(dbName, 1);
	
	request.onupgradeneeded = function(event) {
		db = event.target.result;
		db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
	};
	
	request.onsuccess = function(event) {
		db = event.target.result;
		loadQGendaURL();
	};
	
	request.onerror = function(event) {
		console.error('IndexedDB error:', event.target.errorCode);
	};
}

function getTransaction(storeName, mode) {
	const transaction = db.transaction([storeName], mode);
	return transaction.objectStore(storeName);
}

initDB();

self.addEventListener('message', function(event) {
					  const message = event.data;
					  
					  if (message.type === 'fetch-calendar') {
					  //fetchCalendarInBackground(message.data.url);
					  bgcalendarfetch(message.data.url);
					  }
					  });

async function loadQGendaURL() {
	const store = getTransaction(storeName, 'readonly');
	const request = store.get('qgendaurl');
	request.onsuccess = function(event) {
		const result = event.target.result;
		if (result) {
			myurl= result.value;
		}
	};
}

async function bgcalendarfetch (url) {     
	
if (url) {
	const calendarData = await fetchCalendar(url);
	
	if (calendarData) {
		const events = parseICalendar(calendarData);
		
			// Process and store events in IndexedDB
		for (const event of events) {
			const eventDate = formatQDate(formatDateTime(new Date(parseCustomDate(event.details.start.replace(/\r$/, '')))));
			await storeOrUpdateAssignmentInDB(eventDate, event.details.summary);
		}
		
		
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

	// Function to store or update assignment in IndexedDB
function storeOrUpdateAssignmentInDB(date, summary) {
	return new Promise((resolve, reject) => {
					   const store = getTransaction(storeName, 'readwrite');
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
					   const store = getTransaction(storeName, 'readonly');
					   const request = store.get(date);
					   
					   request.onsuccess = function(event) {
					   resolve(event.target.result);
					   };
					   
					   request.onerror = function(event) {
					   reject(event.target.error);
					   };
					   });
	}
