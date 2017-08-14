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
	const self=convertCSS;
	if (self.cssLength && self.cssLength === document.styleSheets.length) return;

	iterateCSS( (selector, propertyName, propertyValue, propertyPriority, cssRule) => {
		const lcPropertyName=propertyName.toLowerCase();
		if (lcPropertyName!=='background' && lcPropertyName!=='background-color') return;
		
		let s=convertBGstr(propertyValue);
		if (s!==propertyValue) cssRule.style.setProperty(propertyName, s, propertyPriority);
		//if (s!==propertyValue) console.log(selector+' / '+propertyName+' : '+propertyValue +' => '+s);
	});
	
	self.cssLength=document.styleSheets.length;
}


function getBGcolor(elem) {
	if (!elem.style) return '';
	return window.getComputedStyle(elem, null).getPropertyValue('background-color');
}

function setBGcolor(elem, color) {
	if (elem.style) elem.style.backgroundColor = color;
}

function isTransparent(bgStr) {
	return (bgStr === undefined || bgStr === 'transparent' || bgStr.startsWith('rgba(0, 0, 0, 0)'));
}

function convertElem(elem) {
	if (elem.tagName==='IFRAME') return;
	if (!elem.style) return;
	const body=(elem===document.body), bg = elem.style.backgroundColor;		

	if (elem===document.documentElement || elem===document.body) {
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

function convertAllElems(root) {
	if (root.tagName==='IFRAME') return;
	convertElem(root);

	if (!root.getElementsByTagName) return;

	const now=performance.now(), elems=root.getElementsByTagName('*'), t1=performance.now()-now;
	for (const elem of elems) {
		if (elem.tagName==='IFRAME') continue;
		convertElem(elem);
	}
	if (root===document.documentElement) console.log('whitebuster: '+elems.length+' '+t1+' '+(performance.now()-now));
}

function handleMutations(mutations, observer) {
	observer.disconnect();

	convertCSS();
	for (const mutation of mutations) {
		if (mutation.type === 'attributes') convertElem(mutation.target);
		for (const elem of mutation.addedNodes) {
			if (elem.nodeType === Node.ELEMENT_NODE) convertAllElems(elem);
		}
	}

	observer.connect();
}

function whitebust(color) {
	function validNum(x) { return Number.isInteger(x) && x>=0 && x<=255; }
	
	if (!color) return;
	try { color=JSON.parse(color); } catch(err) { return; }
	if (!Array.isArray(color) || color.length!=3 || !validNum(color[0]) || !validNum(color[1]) || !validNum(color[2])) color=[255, 255, 255];

	if (!whitebust.alredyRun && (color[0]===255 && color[1] === 255 && color[2]===255)) return;

	document.documentElement.style.setProperty('--whitebusterR', String(color[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(color[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(color[2]));

	if (whitebust.alredyRun) return;
	whitebust.alredyRun=true;

	convertCSS()
	convertAllElems(document.documentElement);

	const observer = new MutationObserver(handleMutations);
	observer.connect=function() { this.observe(document, { childList: true, subtree:true, attributes: true }); };
	observer.connect();
}

if (window.WHITEBUSTERINJECTED) return;
window.WHITEBUSTERINJECTED=true;

chrome.storage.sync.get(null, storage => { if (!chrome.runtime.lastError) whitebust(storage.color); });
chrome.runtime.onMessage.addListener(msg => { if (!chrome.runtime.lastError) whitebust(msg.color); });

})();