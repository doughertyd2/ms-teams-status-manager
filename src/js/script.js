chrome.runtime.onInstalled.addListener(async () => {
	chrome.alarms.create("forceTeamsAvailability", {
		periodInMinutes: 0.5,
	});
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === "forceTeamsAvailability") {
		runForceAvailability();
	}
});

chrome.storage.onChanged.addListener(function (changes) {
	if (changes.isEnabled || changes.statusType) {
		runForceAvailability();
	}
});

const runForceAvailability = async function (isEnabled = true) {
	chrome.storage.sync.get(["isEnabled"], function (data) {
		isEnabled = data.isEnabled; // Ensure we have the latest state
		if (isEnabled) {
			chrome.tabs.query(
				{
					url: "https://teams.microsoft.com/*",
				},
				function (items) {
					for (let tab of items) {
						console.log("Tab found: " + tab.url);

						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							function: requestForceAvailability,
						});

						// Inject scripts only if enabled
						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							function: simulateMouseMovement,
						});

						break; // Stop after the first tab
					}
				}
			);
		}
	});
};

function simulateMouseMovement() {
	const radius = 100; // Radius of the circle
	const centerX = window.innerWidth / 2; // X coordinate of the circle's center
	const centerY = window.innerHeight / 2; // Y coordinate of the circle's center
	let angle = 0; // Starting angle
	const speed = 0.05; // Speed of movement in radians per frame

	// Calculate the total number of steps to make a full circle based on speed
	const steps = Math.ceil((2 * Math.PI) / speed);
	let currentStep = 0;

	console.log("Simulating mouse movement...");

	const moveMouse = () => {
		if (currentStep >= steps) {
			return; // Complete the function after one full circle
		}

		const x = centerX + radius * Math.cos(angle);
		const y = centerY + radius * Math.sin(angle);
		angle += speed;
		currentStep++;

		const mouseEvent = new MouseEvent("mousemove", {
			view: window,
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
		});

		document.dispatchEvent(mouseEvent);

		// Schedule the next step
		requestAnimationFrame(moveMouse);
	};

	moveMouse();
}

function requestForceAvailability() {
	chrome.storage.sync.get(["isEnabled", "statusType", "permanentToken"], async (storage) => {
		let { isEnabled, statusType, permanentToken } = storage;

		if (isEnabled) {
			console.log("Setting status to: " + statusType);

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

			async function getResponse(request) {
				const response = await fetch(request);
				if (response.ok) {
					console.log("Status successfully set to: " + statusType);
				} else if (response.status === 401) {
					console.log("Error: Removing invalid token from storage...");
					chrome.storage.sync.remove("permanentToken", () => {});
				} else {
					console.log("Error: Status could not be set to: " + statusType);
				}
				return response;
			}

			if (!permanentToken) {
				console.log("Bearer token missing, searching for a new one...");
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
								await new Promise((r) => setTimeout(r, 300));
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
}
