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
	chrome.storage.sync.get(["isEnabled", "statusType", "requestCount", "startTime", "endTime", "onlyRunInTimeWindow", "paid"], async (storage) => {
		let { isEnabled, statusType, requestCount } = storage;
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
				const latestOid = localStorage["ts.latestOid"];
				const tokenJSON = localStorage["ts." + latestOid + ".cache.token.https://presence.teams.microsoft.com/"];
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
