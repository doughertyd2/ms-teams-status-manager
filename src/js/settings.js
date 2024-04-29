document.addEventListener("DOMContentLoaded", () => {
	initTokenIcon();
	initSliders();
	initStatusChangeListeners();
	checkAndInitializeStatus();
	handleMessageFromBackground();
});

function initTokenIcon() {
	chrome.storage.sync.get(["hasPermanentToken"], (storage) => {
		const tokenIcon = document.querySelector(".token-icon .icon");
		tokenIcon.classList.toggle("active", !!storage.hasPermanentToken);
	});
}

function initSliders() {
	document.getElementById("slider-enable").addEventListener("mousedown", () => toggleSlider(true));
	document.getElementById("slider-disable").addEventListener("mousedown", () => toggleSlider(false));
}

function initStatusChangeListeners() {
	document.getElementById("status-available").addEventListener("mousedown", () => updateStatus("available"));
	document.getElementById("status-busy").addEventListener("mousedown", () => updateStatus("busy"));
	document.getElementById("status-away").addEventListener("mousedown", () => updateStatus("berightback"));
	document.getElementById("enable-extension").addEventListener("mousedown", toggleExtensionEnabled);
}

function checkAndInitializeStatus() {
	chrome.storage.sync.get(["statusType", "isEnabled"], (storage) => {
		const isEnabled = storage.isEnabled !== undefined ? storage.isEnabled : false;
		const statusType = storage.statusType !== undefined ? storage.statusType : "available";

		updateToggleState(isEnabled, false);
		updateStatusDisplay(isEnabled, statusType);
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
		available: "var(--teams-status-available)",
		busy: "var(--teams-status-busy)",
		berightback: "var(--teams-status-away)",
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
		const tokenIcon = document.querySelector(".token-icon .icon");
		tokenIcon.classList.toggle("active", message.tokenFound);
		setStorageValue("hasPermanentToken", message.tokenFound);
	});
}
