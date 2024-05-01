chrome.runtime.onInstalled.addListener(async () => {
	chrome.alarms.create("forceTeamsAvailability", {
		periodInMinutes: 1,
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
						console.log("[MSTSM] Tab found: " + tab.url);

						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							function: simulateMouseMovement,
						});

						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							function: checkCurrentStatus,
						});

						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							function: requestForceAvailability,
						});

						break; // Stop after the first tab
					}
				}
			);
		}
	});
};

function checkCurrentStatus() {
	// get the current status directly from the DOM
	const getCurrentStatus = () => {
		return document.querySelector("#idna-me-control-avatar-trigger").getAttribute("aria-label");
	};

	const currentStatus = getCurrentStatus();

	// Check if the current status contains the words "available" and make sure it's case insensitive
	if ((currentStatus && currentStatus.toLowerCase().includes("call")) || currentStatus.toLowerCase().includes("meeting")) {
		// create chrome storage variable "hasCall"
		chrome.storage.sync.set({ hasCall: true });
		chrome.runtime.sendMessage({ callFound: true });
	} else {
		chrome.storage.sync.set({ hasCall: false });
		chrome.runtime.sendMessage({ callFound: false });
	}
}

function simulateMouseMovement() {
	const radius = 100; // Radius of the circle
	const centerX = window.innerWidth / 2; // X coordinate of the circle's center
	const centerY = window.innerHeight / 2; // Y coordinate of the circle's center
	let angle = 0; // Starting angle
	const speed = 0.05; // Speed of movement in radians per frame

	// Calculate the total number of steps to make a full circle based on speed
	const steps = Math.ceil((2 * Math.PI) / speed);
	let currentStep = 0;

	console.log("[MSTSM] Simulating mouse movement...");

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
	chrome.storage.sync.get(["isEnabled", "statusType", "permanentToken", "hasCall"], async (storage) => {
		let { isEnabled, statusType, permanentToken, hasCall } = storage;

		if (isEnabled) {
			// if the user is in a call, don't change the status
			if (hasCall) {
				console.log("[MSTSM] User is in a call, status will not be changed.");
				return; // Stop execution if the user is in a call
			}

			console.log("[MSTSM] Setting status to: " + statusType);

			async function createRequest(bearerToken) {
				const request = new Request("https://presence.teams.microsoft.com/v1/me/forceavailability/", {
					headers: {
						Accept: "application/json",
						Authorization: "Bearer " + bearerToken,
						"Content-Type": "application/json",
						"Content-Length": "0",
						"X-Ms-Client-Caller": "",
						"X-Ms-Client-Type": "cdlworker",
						"X-Ms-Client-User-Agent": "Teams-V2-Web",
						Behavioroverride: "redirectAs404",
					},
					body: `{"availability":"${statusType}"}`,
					method: "PUT",
				});
				return request;
			}

			async function getResponse(request) {
				const response = await fetch(request);
				if (response.ok) {
					console.log("[MSTSM] Status successfully set to: " + statusType);
				} else if (response.status === 401) {
					console.log("[MSTSM] Error: Removing invalid token from storage...");
					// Reset the token's value to undefined
					permanentToken = undefined;
				} else {
					console.log("[MSTSM] Error: Status could not be set to: " + statusType);
				}
				return response;
			}

			if (!permanentToken) {
				console.log("[MSTSM] Bearer token missing, searching for a new one...");
				chrome.runtime.sendMessage({ tokenFound: false });
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

						// Check if the item has the structure of a token object and contains the target domain
						if (parsedItem && parsedItem.credentialType === "AccessToken" && parsedItem.tokenType === "Bearer" && parsedItem.secret && parsedItem.target && parsedItem.target.includes("presence.teams.microsoft.com")) {
							const bearerToken = parsedItem.secret; // The 'secret' field is assumed to be the bearer token

							// Test if the token is valid using the request and response functions
							const request = await createRequest(bearerToken);
							const response = await getResponse(request);

							// Rate limit if the token is not valid
							if (!response.ok) {
								await new Promise((resolve) => setTimeout(resolve, 1000));
							}

							if (response.ok) {
								console.log("[MSTSM] Valid bearer token found: " + bearerToken);
								chrome.runtime.sendMessage({ tokenFound: true });
								chrome.storage.sync.set({ permanentToken: bearerToken }, () => {});
								return; // Exit the function once a valid token is found
							} else {
								// Token is not valid, log this and continue to the next item
								console.log("[MSTSM] Found token is not valid, trying next.");
							}
						}
					} catch (e) {
						// The item was not JSON or did not have the expected structure; ignore and move to the next
						continue;
					}
				}

				console.log("[MSTSM] No valid bearer token found in localStorage.");
			}
		}
	});
}
