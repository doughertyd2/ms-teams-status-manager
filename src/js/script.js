chrome.runtime.onInstalled.addListener(async () => {
	chrome.alarms.create("forceTeamsAvailability", {
		periodInMinutes: 0.3,
	});
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === "forceTeamsAvailability") {
		runForceAvailability();
	}
});

// if the status or isEnabled is changed in the chrome storage, run the force availability function
chrome.storage.onChanged.addListener(function (changes) {
	for (key in changes) {
		if (key === "statusType" || key === "isEnabled") {
			runForceAvailability();
		}
	}
});

const runForceAvailability = async function () {
	chrome.tabs.query(
		{
			url: "https://teams.microsoft.com/*",
		},
		function (items) {
			for (let tab of items) {
				console.log("tab found: " + tab.url);

				// Inject and execute the simulateMouseMovement function to prevent "away" status
				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					function: simulateMouseMovement,
				});

				chrome.scripting.executeScript({
					target: { tabId: tab.id },
					function: requestForceAvailability,
				});

				break; // Stop after the first tab
			}
		}
	);
};

// Mouse movement simulation function
function simulateMouseMovement() {
	const radius = 100; // Radius of the circle
	const speed = 0.05; // Speed of movement
	const centerX = window.innerWidth / 2; // X coordinate of the circle's center
	const centerY = window.innerHeight / 2; // Y coordinate of the circle's center
	let angle = 0; // Starting angle

	const moveMouse = () => {
		const x = centerX + radius * Math.cos(angle);
		const y = centerY + radius * Math.sin(angle);
		angle += speed;

		const mouseEvent = new MouseEvent("mousemove", {
			view: window,
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
		});

		document.dispatchEvent(mouseEvent);
		requestAnimationFrame(moveMouse);
	};

	moveMouse();
}

const requestForceAvailability = function () {
	chrome.storage.sync.get(["isEnabled", "statusType", "permanentToken"], async (storage) => {
		let { isEnabled, statusType, permanentToken } = storage;

		if (isEnabled) {
			console.log("Setting status to: " + statusType);

			// Create a request to the force availability endpoint
			async function createRequest(bearerToken) {
				const request = new Request("https://presence.teams.microsoft.com/v1/me/forceavailability/", {
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + bearerToken,
					},
					body: `{"availability":"${statusType}"}`,
					method: "PUT",
				});
				return request;
			}

			// Send the request
			async function getResponse(request) {
				const response = await fetch(request);
				if (response.ok) {
					console.log("Status successfully set to: " + statusType);
				} else {
					chrome.storage.sync.set(
						{
							permanentToken: null,
						},
						() => {}
					);
					console.log("Error: Status could not be set to: " + statusType);
				}
				return response;
			}

			// if the user does not have a permanent token, find one
			if (!permanentToken) {
				console.log("Invalid bearer token found, searching for a new one...");
				findBearerToken();
			} else {
				const request = await createRequest(permanentToken);
				await getResponse(request);
			}

			// Function to search through localStorage for bearer tokens and validate them
			async function findBearerToken() {
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					const item = localStorage.getItem(key);

					try {
						// Attempt to parse each item in case it's JSON
						const parsedItem = JSON.parse(item);

						// Check if the item has the structure of a token object
						if (parsedItem && parsedItem.credentialType === "AccessToken" && parsedItem.tokenType === "Bearer" && parsedItem.secret) {
							const bearerToken = parsedItem.secret; // The 'secret' field is assumed to be the bearer token

							// Test if the token is valid using the request and response functions
							const request = await createRequest(bearerToken);
							const response = await getResponse(request);

							// Rate limit if the token is not valid
							if (!response.ok) {
								await new Promise((r) => setTimeout(r, 200));
							}

							if (response.ok) {
								console.log("Valid bearer token found: " + bearerToken);
								chrome.storage.sync.set({ permanentToken: bearerToken }, () => {});
								return; // Exit the function once a valid token is found
							} else {
								// Token is not valid, log this and continue to the next item
								console.log("Found token is not valid, trying next.");
							}
						}
					} catch (e) {
						// The item was not JSON or did not have the expected structure; ignore and move to the next
						continue;
					}
				}

				console.log("No valid bearer token found in localStorage.");
			}
		}
	});
};
