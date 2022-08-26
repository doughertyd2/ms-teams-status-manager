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
		if (savedTextElement.innerText === "") savedTextElement.innerText = "Saved!";
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
});
