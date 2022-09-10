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
	chrome.storage.sync.get(["isEnabled", "statusType", "requestCount", "startTime", "endTime", "onlyRunInTimeWindow"], async (storage) => {
		let { isEnabled, statusType, requestCount, startTime, endTime, onlyRunInTimeWindow } = storage;

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
			try {
				const openDbs = localStorage['ts.openDbs'].split('"')[1].replace("skypexspaces-teams-offline-actions-storage-","");
				const tokenJSON = localStorage["ts." + openDbs + ".cache.token.https://presence.teams.microsoft.com/"];
				const token = JSON.parse(tokenJSON).token;

				const response = await fetch("https://presence.teams.microsoft.com/v1/me/forceavailability/", {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: `{"availability":"${statusType}"}`,
					method: "PUT",
				});

				if (response.ok) {
					requestCount += 1;

					chrome.storage.sync.set(
						{
							requestCount: requestCount,
						},
						() => {}
					);
				}
				console.log("Microsoft Teams:");
				console.log(response);
			} catch (e) {
				console.log("Microsoft Teams: HTTP req failed: " + e);
			}
		} else {
			console.log("Microsoft Teams: Currently Disabled");
		}
	});
};
