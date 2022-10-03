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

// if the status is changed in the chrome storage, run the force availability function
chrome.storage.onChanged.addListener(function (changes) {
	for (key in changes) {
		if (key === "statusType") {
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
			for (tab of items) {
				console.log("tab found: " + tab.url);
				chrome.scripting.executeScript(
					{
						target: {
							tabId: tab.id,
						},
						function: requestForceAvailability,
					},
					() => {}
				);
				break;
			}
		}
	);
};

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
				if (!response.ok) {
					chrome.storage.sync.set(
						{
							permanentToken: undefined,
						},
						() => {}
					);
				} else {
					console.log("Status successfully set to: " + statusType);
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

			// Search through localStorage for all bearer tokens, if one is found, store it in permanentToken
			async function findBearerToken() {
				let tokenKeys = [];
				for (let i = 0; i < localStorage.length; i++) {
					let key = localStorage.key(i);
					if (key.includes("token")) {
						tokenKeys.push(localStorage.getItem(key));
					}
				}
				for (let i = 0; i < tokenKeys.length; i++) {
					if (tokenKeys[i].includes('{"token":')) {
						const bearerToken = JSON.parse(tokenKeys[i]).token;
						// test if the token is valid using the request and response functions
						const request = await createRequest(bearerToken);
						const response = await getResponse(request);
						// if the token is valid, save the bearerToken into the chrome storage and break the loop
						if (response.ok) {
							chrome.storage.sync.set(
								{
									permanentToken: bearerToken,
								},
								() => {}
							);
							break;
						}
					}
				}
			}
			// end of bearer token search
		}
	});
};
