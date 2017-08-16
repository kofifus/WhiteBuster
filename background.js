(function () { 
'use strict';

chrome.runtime.onInstalled.addListener(details => {
	if(details.reason === 'install') {
		chrome.storage.sync.set( {'color': [245,245,245], 'customColor0': [255,255,255], 'customColor1': [255,255,255] }, () => {
			chrome.tabs.query({}, tabs => {
				tabs.forEach(tab => {
					chrome.tabs.executeScript(tab.id, { file: 'whitebuster.js'}, result => {
						const lastErr = chrome.runtime.lastError;
						if (lastErr) console.log('tab: ' + tab.id + ' lastError: ' + JSON.stringify(lastErr));
					});
				});
			});
		});
	} 
	/* else if(details.reason === 'update') {
		const thisVersion = chrome.runtime.getManifest().version;
	}	*/
});

})();
