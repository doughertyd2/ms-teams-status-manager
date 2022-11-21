let queued = false;

document.addEventListener("DOMContentLoaded", () => {
	// when the user clicks on the slider-container's first p element, add the class "enabled" to the slider-container
	document.getElementById("slider-enable").addEventListener("mousedown", function () {
		document.getElementsByClassName("slider-container")[0].classList.add("enabled");
	});
	// when the user clicks on the slider-container's second p element, remove the class "enabled" from the slider-container
	document.getElementById("slider-disable").addEventListener("mousedown", function () {
		document.getElementsByClassName("slider-container")[0].classList.remove("enabled");
	});
	chrome.storage.sync.get(["statusType", "isEnabled"], (storage) => {
		// get the variables from storage
		let { isEnabled, statusType } = storage;
		// if the status is undefined, set it to "available"
		if (statusType === undefined) {
			statusType = "available";
			chrome.storage.sync.set(
				{
					statusType: "available",
				},
				() => {}
			);
		}
		// if the isEnabled is undefined, set it to false
		if (isEnabled === undefined) {
			isEnabled = false;
			chrome.storage.sync.set(
				{
					isEnabled: false,
				},
				() => {}
			);
		}
		// get the isEnabled variable and change the slider-container's class accordingly
		if (isEnabled) {
			isEnabled = true;
			chrome.storage.sync.set(
				{
					isEnabled: true,
				},
				() => {}
			);
			document.getElementsByClassName("slider-switch")[0].style.transition = "none";
			document.getElementsByClassName("slider-container")[0].classList.add("enabled");
			document.getElementsByClassName("user-container")[0].style.pointerEvents = "all";
			changeStatus();
		} else {
			isEnabled = false;
			chrome.storage.sync.set(
				{
					isEnabled: false,
				},
				() => {}
			);
			document.getElementsByClassName("slider-container")[0].classList.remove("enabled");
			document.getElementsByClassName("user-status")[0].style.backgroundColor = "transparent";
			document.getElementsByClassName("user-status-ping")[0].style.boxShadow = "0 0 0 2px transparent";
			document.getElementsByClassName("user-container")[0].style.pointerEvents = "none";
		}
		// function that changes the background-color of user-status to the color of the status variable
		function changeStatus() {
			console.log(statusType);
			if (statusType == "available") {
				document.getElementsByClassName("user-status")[0].style.backgroundColor = "var(--teams-status-available)";
				document.getElementsByClassName("user-status-ping")[0].style.boxShadow = "0 0 0 2px var(--teams-status-available)";
				chrome.action.setIcon({ path: "../images/available.png" });
			} else if (statusType == "busy") {
				document.getElementsByClassName("user-status")[0].style.backgroundColor = "var(--teams-status-busy)";
				document.getElementsByClassName("user-status-ping")[0].style.boxShadow = "0 0 0 2px var(--teams-status-busy)";
				chrome.action.setIcon({ path: "../images/busy.png" });
			} else if (statusType == "berightback") {
				document.getElementsByClassName("user-status")[0].style.backgroundColor = "var(--teams-status-away)";
				document.getElementsByClassName("user-status-ping")[0].style.boxShadow = "0 0 0 2px var(--teams-status-away)";
				chrome.action.setIcon({ path: "../images/away.png" });
			}
		}
		// if the id "status-available" is clicked, update the status variable and change the status
		document.getElementById("status-available").addEventListener("mousedown", function () {
			console.log("clicked available");
			statusType = "available";
			chrome.storage.sync.set(
				{
					statusType: "available",
				},
				() => {}
			);
			changeStatus();
		});
		// if the id "status-busy" is clicked, update the status variable and change the status
		document.getElementById("status-busy").addEventListener("mousedown", function () {
			console.log("clicked busy");
			statusType = "busy";
			chrome.storage.sync.set(
				{
					statusType: "busy",
				},
				() => {}
			);
			changeStatus();
		});
		// if the id "status-away" is clicked, update the status variable and change the status
		document.getElementById("status-away").addEventListener("mousedown", function () {
			console.log("clicked away");
			statusType = "berightback";
			chrome.storage.sync.set(
				{
					statusType: "berightback",
				},
				() => {}
			);
			changeStatus();
		});
		// if the id "enable-extension" is not enabled, then change the background-color of user-status to gray
		document.getElementById("enable-extension").addEventListener("mousedown", function () {
			document.getElementsByClassName("slider-switch")[0].style.transition = "transform 0.3s ease-in-out";
			if (document.getElementById("enable-extension").classList.contains("enabled")) {
				changeStatus();
				document.getElementsByClassName("user-container")[0].style.pointerEvents = "all";
			} else {
				document.getElementsByClassName("user-status")[0].style.backgroundColor = "transparent";
				document.getElementsByClassName("user-status-ping")[0].style.boxShadow = "0 0 0 2px transparent";
				document.getElementsByClassName("user-container")[0].style.pointerEvents = "none";
				chrome.action.setIcon({ path: "../images/16x16.png" });
			}
		});
		// add an event listener to the class .user-container and delect if the class contains the class .enabled
		document.getElementsByClassName("slider-container")[0].addEventListener("click", () => {
			if (document.getElementsByClassName("slider-container")[0].classList.contains("enabled")) {
				chrome.storage.sync.set(
					{
						isEnabled: true,
					},
					() => {}
				);
			} else {
				chrome.storage.sync.set(
					{
						isEnabled: false,
					},
					() => {}
				);
			}
		});
	});
});
