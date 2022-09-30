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
	chrome.storage.sync.get(["isEnabled", "statusType", "requestCount", "startTime", "endTime", "onlyRunInTimeWindow", "permanentToken"], async (storage) => {
		let { isEnabled, statusType, requestCount, startTime, endTime, onlyRunInTimeWindow, permanentToken } = storage;

		console.log(`startTime: ${startTime}`);
		console.log(`endTime: ${endTime}`);
		if (onlyRunInTimeWindow && startTime && endTime) {
			const currentDate = new Date();
			const startDate = new Date(currentDate.getTime());
			startDate.setHours(startTime.split(":")[0]);
			startDate.setMinutes(startTime.split(":")[1]);
			startDate.setSeconds("00");

			const endDate = new Date(currentDate.getTime());
			endDate.setHours(endTime.split(":")[0]);
			endDate.setMinutes(endTime.split(":")[1]);
			endDate.setSeconds("00");
			const isBetween = startDate < currentDate && endDate > currentDate;
			if (!isBetween) {
				console.log("onlyRunInTimeWindow set to true and current time is not in inputted window");
				return;
			} else {
				console.log("onlyRunInTimeWindow set to true and time is in window! Running force availability...");
			}
		}

		if (requestCount === undefined) {
			chrome.storage.sync.set(
				{
					requestCount: 0,
				},
				() => {}
			);
			requestCount = 0;
		}
		console.log("Count: " + requestCount);
		console.log("Status: " + statusType);

		if (!statusType) {
			chrome.storage.sync.set(
				{
					statusType: "Available",
				},
				() => {}
			);
			statusType === "Available";
		}

		if (isEnabled || isEnabled === undefined) {
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
					chrome.storage.sync.set(
						{
							requestCount: requestCount + 1,
						},
						() => {}
					);
				} else {
					chrome.storage.sync.set(
						{
							permanentToken: undefined,
						},
						() => {}
					);
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
