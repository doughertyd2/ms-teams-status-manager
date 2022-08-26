const resetCount = function () {
	chrome.storage.sync.set(
		{
			requestCount: 0,
		},
		() => {
			updateRequestCount();
		}
	);
};

const updateRequestCount = function () {
	chrome.storage.sync.get(["requestCount"], function (storage) {
		const { requestCount } = storage;
		const countElement = document.getElementById("count");
		if (requestCount) {
			countElement.innerHTML = requestCount;
		} else {
			countElement.innerHTML = 0;
		}
	});
};

setInterval(updateRequestCount, 10 * 1000);

let queued = false;

document.addEventListener("DOMContentLoaded", () => {
	updateRequestCount();
	document.getElementById("resetCount").addEventListener("click", resetCount);

	const enabledCheckbox = document.getElementById("enabledCheckbox");
	enabledCheckbox.addEventListener("change", () => {
		const savedTextElement = document.getElementById("saved-text");
		if (!queued) {
			setTimeout(() => {
				queued = false;
				savedTextElement.innerText = "";
			}, 5000);
		}
		queued = true;
		chrome.storage.sync.set(
			{
				isEnabled: enabledCheckbox.checked,
			},
			() => {}
		);
	});

	chrome.storage.sync.get(["isEnabled"], async (storage) => {
		const { isEnabled } = storage;
		if (isEnabled === undefined) {
			chrome.storage.sync.set(
				{
					isEnabled: true,
				},
				() => {}
			);
			enabledCheckbox.checked = true;
		} else {
			enabledCheckbox.checked = isEnabled;
		}
	});

	const timeWindowCheckbox = document.getElementById("timeWindowCheckbox");
	chrome.storage.sync.get(["onlyRunInTimeWindow"], async (storage) => {
		const { onlyRunInTimeWindow } = storage;

		if (onlyRunInTimeWindow === undefined) {
			chrome.storage.sync.set(
				{
					onlyRunInTimeWindow: false,
				},
				() => {}
			);
			timeWindowCheckbox.checked = false;
		} else {
			timeWindowCheckbox.checked = onlyRunInTimeWindow;
		}
	});
	timeWindowCheckbox.addEventListener("change", () => {
		chrome.storage.sync.set(
			{
				onlyRunInTimeWindow: timeWindowCheckbox.checked,
			},
			() => {}
		);
	});

	const startTimeInput = document.getElementById("startTimeInput");
	const endTimeInput = document.getElementById("endTimeInput");
	chrome.storage.sync.get(["startTime"], async (storage) => {
		const { startTime } = storage;

		if (startTime === undefined) {
			chrome.storage.sync.set(
				{
					startTime: "08:00",
				},
				() => {}
			);
			startTimeInput.value = "08:00";
		} else {
			startTimeInput.value = startTime;
		}
	});
	chrome.storage.sync.get(["endTime"], async (storage) => {
		const { endTime } = storage;

		if (endTime === undefined) {
			chrome.storage.sync.set(
				{
					endTime: "17:30",
				},
				() => {}
			);
			endTimeInput.value = "17:30";
		} else {
			endTimeInput.value = endTime;
		}
	});
	startTimeInput.addEventListener("change", () => {
		chrome.storage.sync.set(
			{
				startTime: startTimeInput.value,
			},
			() => {}
		);
	});
	endTimeInput.addEventListener("change", () => {
		chrome.storage.sync.set(
			{
				endTime: endTimeInput.value,
			},
			() => {}
		);
	});
});
