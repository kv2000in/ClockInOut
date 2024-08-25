const CACHE_NAME = 'clock-in-out-tracker-cache-v1';
const urlsToCache = [
					 './',
					 './index.html',
					 './manifest.json',
					 './icons/icon-192x192.webp',
					 './icons/icon-512x512.webp',
					 './service-worker.js'
					 ];

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
					  bgcalendarfetch();
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

self.addEventListener('message', function(event) {
					  const message = event.data;
					  
					  if (message.type === 'fetch-calendar') {
					  //fetchCalendarInBackground(message.data.url);
					  bgcalendarfetch();
					  }
					  });

async function loadQGendaURL() {
	const store = getTransaction(storeName, 'readonly');
	const request = store.get('qgendaurl');
	request.onsuccess = function(event) {
		const result = event.target.result;
		if (result) {
			return result.value;
		}
	};
}

async function bgcalendarfetch {     
	const url = loadQGendaURL();
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
