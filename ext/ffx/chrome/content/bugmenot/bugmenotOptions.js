function bugmenot_initializeOptions() {
	var bugmenotPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("bugmenot.");
	if (bugmenotPrefs.prefHasUserValue("optDisableAutoSubmit")) {
		document.getElementById("bugmenotDisableAutoSubmit").checked = bugmenotPrefs.getBoolPref("optDisableAutoSubmit");
	}
	if (bugmenotPrefs.prefHasUserValue("optDisableAutoNext")) {	
		document.getElementById("bugmenotDisableAutoNext").checked = bugmenotPrefs.getBoolPref("optDisableAutoNext");
	}
	if (bugmenotPrefs.prefHasUserValue("optDisableExtraMenu")) {
		document.getElementById("bugmenotDisableExtraMenu").checked = bugmenotPrefs.getBoolPref("optDisableExtraMenu");
	}
}

function bugmenot_saveOptions() {
	var bugmenotPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("bugmenot.");
	bugmenotPrefs.setBoolPref("optDisableAutoSubmit", document.getElementById("bugmenotDisableAutoSubmit").checked);
	bugmenotPrefs.setBoolPref("optDisableAutoNext", document.getElementById("bugmenotDisableAutoNext").checked);
	bugmenotPrefs.setBoolPref("optDisableExtraMenu", document.getElementById("bugmenotDisableExtraMenu").checked);
}

