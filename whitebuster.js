(function () { 
'use strict';

const RGBstr='rgb(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB))';
let RGBAstr='rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),';

function convertBGstr(str) {
	let regRgb = new RegExp('(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))', 'ig');
	let regRgba = new RegExp('rgba\\((?:255, 255, 255|254, 254, 254),(.+)\\)', 'ig');

	let res=str.replace(regRgb, RGBstr);
	res=res.replace(regRgba, RGBAstr+' $1)');

	return res;
}

function iterateCSS(f) {
	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type !== 1 || !cssRule.style) continue;
			const selector = cssRule.selectorText, style=cssRule.style;
			if (!selector || !style.cssText) continue;
			for (let i=0; i<style.length; i++) {
				const propertyName=style.item(i);
				if (f(selector, propertyName, style.getPropertyValue(propertyName), style.getPropertyPriority(propertyName), cssRule)===false) return;
			}
		}
	}
}

function convertCSS() {
	iterateCSS( (selector, propertyName, propertyValue, propertyPriority, cssRule) => {
		const lcPropertyName=propertyName.toLowerCase();
		if (lcPropertyName!=='background' && lcPropertyName!=='background-color') return;
		
		let s=convertBGstr(propertyValue);
		if (s!==propertyValue) cssRule.style.setProperty(propertyName, s, propertyPriority);
	});
}


function getBGcolor(elem) {
	try { return window.getComputedStyle(elem, null).getPropertyValue('background-color'); } catch (e) { return ''; }
}

function setBGcolor(elem, color) {
	try { elem.style.backgroundColor = color; } catch (e) { /* swallow error */ }
}

function isTransparent(bgStr) {
	return (bgStr === undefined || bgStr === 'transparent' || bgStr.startsWith('rgba(0, 0, 0, 0)'));
}

function convertElem(elem) {
	if (!elem.style) return;
	const body=(elem===document.body), bg = elem.style.backgroundColor;		

	if (elem===document.body) {
		let cbg=getBGcolor(elem, null);
		if ((!bg && !cbg) || isTransparent(cbg)) {
			setBGcolor(elem, RGBstr);
		} else {
			let newCbg=convertBGstr(cbg);
			if (newCbg !== cbg) setBGcolor(elem, newCbg);
		}

	} else if (bg === RGBstr || bg.startsWith(RGBAstr) || isTransparent(bg)) {
		// nothing to do

	} else if (!bg) {
		let cbg=getBGcolor(elem, null);
		let newCbg=convertBGstr(cbg);
		if (cbg && newCbg !== cbg) setBGcolor(elem, newCbg);

	} else {
		let newBg=convertBGstr(bg);
		if (newBg !== bg) setBGcolor(elem, newBg);
	}
}

function convertAllElems(root=document) {
	if (!root.getElementsByTagName) return;
	if (root.tagName==='IFRAME') try { root=elem.contentDocument; } catch(e) {};
	if (root!=document) convertElem(root);

	for (const elem of root.getElementsByTagName('*')) {
		if (elem.tagName==='IFRAME') {
			try { convertAllElems(elem.contentDocument); } catch(e) {};
		} else {
			convertElem(elem);
		}
	}
}

function processMutations(addedNodes) {
	//console.log(addedNodes);
	addedNodes.forEach(convertAllElems);
	addedNodes.length=0;
}	

function handleMutations(mutations, observer) {
	const self=handleMutations;
	if (!self.addedNodes) self.addedNodes=[];
	
	if (self.cssLength && self.cssLength !== document.styleSheets.length) convertCSS();
	self.cssLength=document.styleSheets.length;

	observer.disconnect();

	for (const mutation of mutations) {
		if (mutation.type === 'attributes') convertElem(mutation.target);
		for (const elem of mutation.addedNodes) {
			if (elem.nodeType === Node.ELEMENT_NODE) {
				convertElem(elem);
				self.addedNodes.push(elem);
			}
		}
	}

	observer.connect();
}

function parseColor(s) {
	function validNum(x) { return Number.isInteger(x) && x>=0 && x<=255; }
	let color;
	try { color=JSON.parse(s); } catch(err) { color=[245, 245, 245]; }
	if (!Array.isArray(color) || color.length!=3 || !validNum(color[0]) || !validNum(color[1]) || !validNum(color[2])) color=[255, 255, 255];
	return color;
}

function setColor(color) {
	document.documentElement.style.setProperty('--whitebusterR', String(color[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(color[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(color[2]));
}


chrome.storage.sync.get(null, storage => {
	let color=parseColor(storage.color);
	setColor(parseColor(storage.color));
	
	convertCSS();
	convertAllElems();

	const observer = new MutationObserver(handleMutations);
	observer.connect=function() { this.observe(document, { childList: true, subtree:true, attributes: true }); };
	observer.connect();
});


chrome.runtime.onMessage.addListener(msg => {
	//console.log('new color: '+msg.color);
	if (msg.color) setColor(parseColor(msg.color));
});

})();