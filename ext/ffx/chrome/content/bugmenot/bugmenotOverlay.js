//The extension's code is run from a function to avoid polluting the global namespace
//within the function, this is the global object (ChromeWindow)
(function intializationFunction(arg){

// "Global" variables

var bugmenotstrings = Components.classes["@mozilla.org/intl/stringbundle;1"]
		.getService(Components.interfaces.nsIStringBundleService)
		.createBundle("chrome://bugmenot/locale/bugmenot.properties");
var unablelocateformalert = bugmenotstrings.GetStringFromName("unablelocateform");
var noaccountsfoundalert = bugmenotstrings.GetStringFromName("noaccountsfound");
var noneaccountsworkedalert = bugmenotstrings.GetStringFromName("noneaccountsworked");
var unablelocateloginalert = bugmenotstrings.GetStringFromName("unablelocatelogin");
var erroroccurredalert = bugmenotstrings.GetStringFromName("erroroccurred");
var httpRequest;
var httpRequestCallbackFunction;
var loginFormUrl;
var loginForm = false;
var bugSite;
var usernameElement = false;
var otherElement = false;
var passwordElement = false;
var submitElement = false;
var accountList;
var accountTry;
var loginResponseReceived = false;
 
// Options object

var bugmenotOptions = new Object();

// Set event to enable/disable BugMeNot menu items

window.addEventListener("load", setToggleMenuItemEvent, true);

// BugMeNot Primary Menu Item

this.BugMeNot = function BugMeNot() {
	// Execution starts here, this function is specified by bugmenotOverlay.xul
	loginFormUrl = window._content.document.location.href;
	bugSite = currentDomain(); 
	if (locateForm()) {
		setOptions();
		// Get Username and Password from BugMeNot
		httpGet('http://www.bugmenot.com/view/' + bugSite + '?utm_source=extension&utm_medium=firefox', processBugMeNotResponse);
		// Processing continues in processBugMeNotResponse
		// when http response from BugMeNot server is Received.
	} else {
		alert(unablelocateformalert);
	}
}

// BugMeNot Extra Menu Items

this.BugMeNot_PopulateAccountsMenu = function BugMeNot_PopulateAccountsMenu() {
	var menu = document.getElementById("bugmenotaccounts-popup");
	for(var i=menu.childNodes.length - 1; i>=0; i--) {
		menu.removeChild(menu.childNodes.item(i));
	}

	for(var i=0; i < accountList.snapshotLength; i++)
	{
		var tempItem = null;
		tempItem = document.createElement("menuitem");
		var info = accountTableInfo(i, /username|stats/);
		tempItem.setAttribute("id", "bugmentnotaccount-" + i);
		tempItem.setAttribute("label", info.username);
		tempItem.setAttribute("oncommand",  "BugMeNot_TryAccount(" + i + ")");
		tempItem.setAttribute("tooltiptext", info.stats);
		menu.appendChild(tempItem);
	}
}

this.BugMeNot_TryAccount = function BugMeNot_TryAccount(accountNumber) {
	accountTry = accountNumber;
	loginFromMenuItem();
}

this.BugMeNot_Retry = function BugMeNot_Retry() {
	accountTry++;
	loginFromMenuItem();
}

this.BugMeNot_Success = function BugMeNot_Success() {
	bugmenotOptions.showExtraMenuItems = false
	castVote('Y');
}

this.BugMeNot_Failure = function BugMeNot_Failure() {
	castVote('N');
}


// event callbacks

function processBugMeNotResponse () {
	// use responseText and parse with DOMParser
	// as bugmenot.com sends content as text/html 
	// so responseXml is null	
	var loginFormFound = true;
	var xmlString = "<?xml version=\"1.0\"?>\n" + httpRequest.responseText;
	var domParser = new DOMParser();
	var response = domParser.parseFromString(xmlString, 'text/xml');
	var xpe = new XPathEvaluator();
	accountList = xpe.evaluate('//*[@class="account"]|//*[@class="account valid"]', response, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	if (accountList.snapshotLength > 0) {
		bugmenotOptions.showExtraMenuItems = true;
		accountTry = 0;
		login();
		// Processing continues in processLoginResponse
		// when http response from login attempt is Received.
	} else {
		alert(noaccountsfoundalert);
	}
}

function processLoginResponse (event) {
	if (!bugmenotOptions.submitPage) {
		bugmenotOptions.submitPage = true;
		bugmenotOptions.submitPageDomain = currentDomain();
	}
	
	if (locateForm() && !loginResponseReceived) {
		loginResponseReceived = true;
		//No automatic error reporting
		//if (!bugmenotOptions.disableReportFailure) {
		//	castVote('N');
		//}
		if (!bugmenotOptions.disableAutoNext && !bugmenotOptions.testOnlyOneAccount) {
			accountTry++;
			loginRetry();
			// Processing continues in processLoginResponse
			// when http response from login attempt is Received.
		}else{
			bugmenotOptions.testOnlyOneAccount = false;
		}
	}
}

// Local functions

function locateForm () {
	var loginFormFound = false;
	if (bugmenotOptions.haveForm) {
		loginForm = bugmenotOptions.targetForm;
		loginFormFound = isLoginForm(loginForm);
	}
	if (!loginFormFound) {
		var currentWindow = window._content;
		if (!currentWindow.document.forms.length > 0 && currentWindow.frames.length > 0) {
			for(var i = 0; i < currentWindow.frames.length; i++)	{
				loginFormFound = locateFormInDocument(currentWindow.frames[i].document);
				if (loginFormFound) {
					break;
				}
			}
		} else {
			loginFormFound = locateFormInDocument(currentWindow.document);
		}
		
	}
	return loginFormFound;
}

function locateFormInDocument(targetDocument) {
	var loginFormFound = false;
	for (var i = 0; i < targetDocument.forms.length; i++) {
		loginForm = targetDocument.forms[i];
		loginFormFound = isLoginForm(loginForm);
		if (loginFormFound) {
			break;
		}
	}
	return loginFormFound;
}

function isLoginForm () {
	var loginFormFound = false;
	var usernameFound = false;
	var passwordFound = false;
	var submitFound = false;
	var anySubmitFound = false;
	usernameElement = false;
	otherElement = false;
	passwordElement = false;
	submitElement = false;
	for (var ii = 0; ii < loginForm.elements.length; ii++) {
		var currentElement = loginForm.elements[ii];
		if (currentElement.type.match(/text/i) && currentElement.name.match(/ID|un|name|user|usr|log|email|mail|nick/i)) {
			if (usernameFound) {
				otherElement = usernameElement;
				usernameElement = currentElement;
			} else {
				usernameFound = true;
				usernameElement = currentElement;
			}
		}
		if (currentElement.type.match(/pass/i)) {
			passwordFound = true;
			passwordElement = currentElement;
		}
		if (currentElement.type.match(/submit/i) && !anySubmitFound) {
			submitElement = currentElement;
			anySubmitFound = true;
		}
		if (currentElement.type.match(/submit|button|image/i) &&  currentElement.value.match(/log|sub|sign/i)) {
			submitFound = true;
			submitElement = currentElement;
		}
		if (usernameFound && passwordFound && submitFound) {
			break;
		}
	}
	if (usernameFound && passwordFound) {
		loginFormFound = true;
	}
	return loginFormFound;
}

function login() {
	callOnPageLoad(processLoginResponse);
	
	loginResponseReceived = false;
	var accountInfo = accountTableInfo(accountTry, /username|password/);
	if (!otherElement) {
		usernameElement.value  = accountInfo.username;
	} else {
		accountParts = accountInfo.username.split('/');
		if (accountParts.length > 1) {
			otherElement.value  = accountParts[0].trim();
			usernameElement.value = accountParts[1].trim();
		} else {
			otherElement.value  = accountInfo.username;
			usernameElement.value =  accountInfo.username;
		}
	}
	passwordElement.value = accountInfo.password;
	if (!bugmenotOptions.disableAutoSubmit) {
		if (!submitElement) {
			loginForm.submit();
		} else {
			submitElement.click();
		}
	}
}

function loginRetry() {
	if (accountTry < accountList.snapshotLength) {
		login()
		// Processing continues in processLoginResponse
		// when http response from login attempt is Received.
	} else {	
		alert(noneaccountsworkedalert);
	}
}

function loginRetryRequest() {
	if (locateForm()) {
		loginRetry();
	} else {
		alert(unablelocateloginalert);
	}
}

function loginFromMenuItem() {
	bugmenotOptions.testOnlyOneAccount = true;
	if (window._content.document.location != loginFormUrl && !locateForm()) {
		callOnPageLoad(loginRetryRequest);
		window._content.document.location = loginFormUrl;
	} else {
		loginRetryRequest();
	}
}

function castVote(vote) {
	var voteUrl = 'http://www.bugmenot.com/vote_ajax.php?';
	var queryData = new Array();
	var info = accountInfo(accountTry, /id|site/);
	for (var i in info) {
		queryData.push(i + '=' + info[i]);
	}
	queryData.push('vote=' + vote);
	httpGet(voteUrl + queryData.join('&'), null);	
}

function accountInfo(accountNumber, matchExpression) {
	var element = accountList.snapshotItem(accountNumber);
	var childElementList = element.getElementsByTagName('input');
	var accountInfo = new Object();
	for (var i = 0; i < childElementList.length; i++) {
		if (childElementList[i].name.match(matchExpression)) {
			accountInfo[childElementList[i].name] = childElementList[i].value;
		}
	}
	return accountInfo;
}

function accountTableInfo(accountNumber, matchExpression) {
	var element = accountList.snapshotItem(accountNumber);
	var childElementList = element.getElementsByTagName('tr');
	var accountInfo = new Object();
	for (var i = 0; i < childElementList.length; i++) {
		var rowHeading = childElementList[i].getElementsByTagName('th')[0].textContent.trim().toLowerCase();
		if (rowHeading.match(matchExpression)) {	
			accountInfo[rowHeading] = childElementList[i].getElementsByTagName('td')[0].textContent.trim();
		}
	}
	return accountInfo;
}

function setOptions() {
	var bugmenotPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("bugmenot.");
	if (bugmenotPrefs.prefHasUserValue("optDisableAutoSubmit")) {
		bugmenotOptions.disableAutoSubmit = bugmenotPrefs.getBoolPref("optDisableAutoSubmit");
	} else {
		bugmenotOptions.disableAutoSubmit = false;
	}
	if (bugmenotPrefs.prefHasUserValue("optDisableAutoNext")) {
		bugmenotOptions.disableAutoNext = bugmenotPrefs.getBoolPref("optDisableAutoNext");
	} else {
		bugmenotOptions.disableAutoNext = false;
	}
	if (bugmenotPrefs.prefHasUserValue("optDisableReportFailure")) {
		bugmenotOptions.disableReportFailure = bugmenotPrefs.getBoolPref("optDisableReportFailure");
	} else {
		bugmenotOptions.disableReportFailure = false;
	}
	if (bugmenotPrefs.prefHasUserValue("optDisableExtraMenu")) {
		bugmenotOptions.disableExtraMenu = bugmenotPrefs.getBoolPref("optDisableExtraMenu");
	} else {
		bugmenotOptions.disableExtraMenu = false;
	}
	
	bugmenotOptions.showExtraMenuItems = false;
	bugmenotOptions.haveForm = false;
	bugmenotOptions.submitPage = false;
	bugmenotOptions.submitPageDomain = null;
	bugmenotOptions.testOnlyOneAccount = false;
}

function setToggleMenuItemEvent() {
	window.removeEventListener("load", setToggleMenuItemEvent, true);
	document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", toggleMenuItems, false);
	// Processing continues in toggleMenuItems
	// when context menu is accessed.
}

function toggleMenuItems() {
	if (gContextMenu.onTextInput) {
		bugmenotOptions.haveForm = true;
		bugmenotOptions.targetForm = gContextMenu.target.form;
	}
	document.getElementById("bugmenot").setAttribute('hidden', !gContextMenu.onTextInput);
	var hideSeparator = !gContextMenu.onTextInput;
	var showExtraMenuItems = bugmenotOptions.showExtraMenuItems;
	if (bugmenotOptions.submitPageDomain != currentDomain() ) {
		showExtraMenuItems = false;
	}
	if (showExtraMenuItems && !bugmenotOptions.disableExtraMenu) {
		hideSeparator = false;
		document.getElementById("bugmenotcurrent").setAttribute('label', bugSite);
		document.getElementById("bugmenotcurrent").setAttribute('hidden', false);
		document.getElementById("bugmenotsuccess").setAttribute('hidden', false);
		document.getElementById("bugmenotfailure").setAttribute('hidden', false);
		if (accountList.snapshotLength > 0) {
			document.getElementById("bugmenotaccounts").setAttribute('hidden', false);
		} else {
			document.getElementById("bugmenotaccounts").setAttribute('hidden', false);
		}
		if (accountList.snapshotLength > accountTry) {
			document.getElementById("bugmenotretry").setAttribute('hidden', false);
		} else {
			document.getElementById("bugmenotretry").setAttribute('hidden', true);
		}
	} else {
		document.getElementById("bugmenotcurrent").setAttribute('hidden', true);
		document.getElementById("bugmenotretry").setAttribute('hidden', true);
		document.getElementById("bugmenotfailure").setAttribute('hidden', true);
		document.getElementById("bugmenotsuccess").setAttribute('hidden', true);
		document.getElementById("bugmenotaccounts").setAttribute('hidden', true);
	}
	document.getElementById("bugmenotseparator").setAttribute('hidden', hideSeparator);
}

function currentDomain() {
	var matchLocation = window._content.document.location.href.match(/\/\/([^\/]+)\//);
	if(!matchLocation){
		//will happen with about:config, about:blank,...
		return window._content.document.location.href;
	}else{
		var currentDomain = matchLocation[1];
		return currentDomain;
	}
}

/* 
Dorian Scholz added the following snippet to the httpExecuteCallback function
inform the user that there are no accounts for the requested website in case of a 404.
And for all other response codes the user gets an error message with the response code.
*/

function httpExecuteCallback() {
   if (httpRequestCallbackFunction != null) {
	   if (httpRequest.readyState == 4) {
		   if (httpRequest.status == 200) {
			   httpRequestCallbackFunction();
			   httpRequestCallbackFunction = null;
		   } else if (httpRequest.status == 404) {
			 alert(noaccountsfoundalert);
		   } else {
			 alert((erroroccurredalert) + httpRequest.status);
		   }
	   }
   }
}

function httpGet(url, callbackFunction) {
	httpRequest = false;
	httpRequestCallbackFunction = callbackFunction;
	httpRequest = new XMLHttpRequest();
	httpRequest.onreadystatechange = httpExecuteCallback;
	httpRequest.open('GET', url, true);
	httpRequest.send(null);
}


/*
This function will call callbackFunction at the next page load.
The function is called when the page has finished loading.
The page load may be from any tab. new tab creation is also considered a page load.
callbackFunction will be called only once for the next page load and not for
the subsequent pages loads.
*/
function callOnPageLoad(callbackFunction){
	function internalCallback(event){
		//Check that the load has been fired by the root document and not a frame
		//see https://developer.mozilla.org/en/Code_snippets/Tabbed_browser#Detecting_page_load
		if (event.originalTarget instanceof HTMLDocument) {
			if (event.originalTarget.defaultView.frameElement) {
				// Event fired because a frame within a tab was loaded. 
				//Don't care about frame load.
				return;
			}
		}
		if(event.originalTarget.nodeName !== "#document"){
			//Load event is fired for something other than the document
			//(e.g. an image : event.originalTarget.nodeName == 'xul:image')
			//see https://developer.mozilla.org/en/Code_snippets/On_page_load#Attaching_a_script
			return;
		}
		gBrowser.removeEventListener("load", internalCallback, true);
		callbackFunction();
	}
	
	//window.addEventListener("load", myFunc, true) is NOT fired when loading a page
	//see https://developer.mozilla.org/en/Updating_extensions_for_Firefox_3#Other_changes
	//using gBrowser.addEventListener insted
	gBrowser.addEventListener("load", internalCallback, true); 
}
	
	

// String trim prototype method
if(! String.prototype.trim){
	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/g, ""); };
}

}).apply();//end and call of intializationFunction. Apply causes this to be the global object in the function