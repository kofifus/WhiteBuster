(function () { 
'use strict';

function onInstalled(details) {
	if(details.reason === 'install') {
		chrome.storage.sync.set({'color': '[245,245,245]'});

		chrome.tabs.query({}, tabs => {
			tabs.forEach(tab => {
				try { chrome.tabs.executeScript(tab.id, { file: 'whitebuster.js'}); } catch(err) {};
			});
		});

	} else if(details.reason === 'update') {
		const thisVersion = chrome.runtime.getManifest().version;
	}	
}

chrome.runtime.onInstalled.addListener(onInstalled);

})();
