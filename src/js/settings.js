document.addEventListener("DOMContentLoaded", () => {
	initTokenIcon();
	initStatusChangeListeners();
	checkAndInitializeStatus();
	handleMessageFromBackground();
	checkIfTeamsTabIsOpen();
});

// If there exists a tab with the Teams URL, hide the modal
function checkIfTeamsTabIsOpen() {
	chrome.tabs.query({ url: "https://teams.microsoft.com/*" }, (tabs) => {
		const modal = document.querySelector(".modal");
		modal.classList.toggle("hidden", tabs.length > 0);
	});
}

function initTokenIcon() {
	chrome.storage.sync.get(["hasPermanentToken"], (storage) => {
		const tokenIcon = document.querySelector(".key-icon .icon");
		tokenIcon.classList.toggle("active", !!storage.hasPermanentToken);
	});
}

function initStatusChangeListeners() {
	document.getElementById("status-available").addEventListener("mousedown", () => updateStatus("Available"));
	document.getElementById("status-busy").addEventListener("mousedown", () => updateStatus("Busy"));
	document.getElementById("status-dnd").addEventListener("mousedown", () => updateStatus("DoNotDisturb"));
	document.getElementById("status-away").addEventListener("mousedown", () => updateStatus("BeRightBack"));
	document.getElementById("enable-extension").addEventListener("mousedown", toggleExtensionEnabled);
}

function checkAndInitializeStatus() {
	chrome.storage.sync.get(["statusType", "isEnabled"], (storage) => {
		// Check if the extension is enabled, default to false if undefined
		const isEnabled = storage.isEnabled !== undefined ? storage.isEnabled : false;

		// Check if a status type is already set, default to "available" if undefined
		const statusType = storage.statusType !== undefined ? storage.statusType : "available";

		// Update the toggle state and the display of the status without causing a transition animation
		updateToggleState(isEnabled, false);
		updateStatusDisplay(isEnabled, statusType);

		// If the statusType was not set (undefined), initialize it to "available"
		if (storage.statusType === undefined) {
			setStorageValue("statusType", "Available");
		}

		// Similarly, ensure the isEnabled flag is set in storage if it was undefined
		if (storage.isEnabled === undefined) {
			setStorageValue("isEnabled", isEnabled);
		}
	});
}

function updateStatus(statusType) {
	setStorageValue("statusType", statusType);
	chrome.storage.sync.get(["isEnabled"], ({ isEnabled }) => {
		updateStatusDisplay(isEnabled, statusType);
	});
}

function toggleExtensionEnabled() {
	chrome.storage.sync.get(["isEnabled", "statusType"], (storage) => {
		const isEnabled = !storage.isEnabled;
		const statusType = storage.statusType || "available";
		setStorageValue("isEnabled", isEnabled);
		updateToggleState(isEnabled, true);
		updateStatusDisplay(isEnabled, statusType);
	});
}

function updateStatusDisplay(isEnabled, statusType) {
	const statusColorMap = {
		Available: "var(--teams-status-available)",
		Busy: "var(--teams-status-busy)",
		DoNotDisturb: "var(--teams-status-busy)",
		BeRightBack: "var(--teams-status-away)",
	};
	const defaultColor = "transparent";
	const color = isEnabled ? statusColorMap[statusType] || defaultColor : defaultColor;

	const userStatus = document.querySelector(".user-status");
	const userStatusPing = document.querySelector(".user-status-ping");
	const userContainer = document.querySelector(".user-container");

	userStatus.style.backgroundColor = color;
	userStatusPing.style.boxShadow = `0 0 0 2px ${color}`;
	userContainer.style.pointerEvents = isEnabled ? "all" : "none";

	const iconPath = isEnabled ? `../images/${statusType}.png` : "../images/16x16.png";
	chrome.action.setIcon({ path: iconPath });
}

function updateToggleState(isEnabled, doAnimation) {
	const sliderContainer = document.querySelector(".slider-container");
	const sliderSwitch = sliderContainer.querySelector(".slider-switch");

	// Set or remove the transition based on doAnimation
	sliderSwitch.style.transition = doAnimation ? "transform 0.3s ease-in-out" : "none";

	// Update the enabled state of the slider container and the button
	sliderContainer.classList.toggle("enabled", isEnabled);
	const enableExtensionButton = document.getElementById("enable-extension");
	enableExtensionButton.classList.toggle("enabled", isEnabled);
}

function setStorageValue(key, value) {
	let obj = {};
	obj[key] = value;
	chrome.storage.sync.set(obj, () => {
		console.log(`${key} set to ${value}`);
	});
}

function handleMessageFromBackground() {
	chrome.runtime.onMessage.addListener((message) => {
		const tokenIcon = document.querySelector(".key-icon .icon");
		tokenIcon.classList.toggle("active", message.tokenFound);
		setStorageValue("hasPermanentToken", message.tokenFound);
	});
}
