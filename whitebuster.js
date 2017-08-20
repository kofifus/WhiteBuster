(function () { 
'use strict';

const RGBstr = 'rgb(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB))';
const RGBAstr = 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),';
const RGBreg = new RegExp('(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))');
const convertBGstr = str => {
	const s=str.toLowerCase().replace(RGBreg, RGBstr).replace('rgba(255, 255, 255,', RGBAstr).replace('rgba(254, 254, 254,', RGBAstr);
	return s===str ? '' : s;
}

function convertCSS() {
	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type !== 1 || !cssRule.style) continue;
			const selector = cssRule.selectorText, style=cssRule.style;
			if (!selector || !style.cssText) continue;
			for (let i=0; i<style.length; i++) {
				const propertyName=style.item(i);
				if (propertyName!=='background-color') continue;
				const propertyValue=style.getPropertyValue(propertyName), s=convertBGstr(propertyValue);
				if (s) cssRule.style.setProperty(propertyName, s, style.getPropertyPriority(propertyName));
			}
		}
	}
}

const getBGcolor = elem => elem.style ? window.getComputedStyle(elem, null).getPropertyValue('background-color') : undefined;
const isTransparent = bgStr => bgStr === undefined || bgStr === 'transparent' || bgStr.startsWith('rgba(0, 0, 0, 0)');

const convertElem = elem => {
	if (!elem.style || elem instanceof SVGElement) return;

	const bg = elem.style.backgroundColor;		

	if (elem===document.documentElement || elem===document.body) {
		const cbg=getBGcolor(elem, null);
		if ((!bg && !cbg) || isTransparent(cbg)) {
			elem.style.backgroundColor = RGBstr;
		} else {
			const newCbg=convertBGstr(cbg);
			if (newCbg) elem.style.backgroundColor = newCbg;
		}

	} else if (bg === RGBstr || bg.startsWith(RGBAstr) || isTransparent(bg)) {
		// nothing to do

	} else if (!bg) {
		const cbg=getBGcolor(elem, null), newCbg=convertBGstr(cbg);
		if (newCbg) elem.style.backgroundColor = newCbg;

	} else {
		const newbg=convertBGstr(bg);
		if (newbg) elem.style.backgroundColor = newbg;
	}
}

function convertAllElems(root) {
	if (!root) return;
	if (root.tagName==='IFRAME') try { convertAllElems(elem.contentDocument || elem.contentWindow.document); } catch(err) { /* CORS */ };

	if (root.getElementsByTagName) {
		for (const elem of root.getElementsByTagName('*')) {
			convertElem(elem);
			if (elem.tagName==='IFRAME') try { convertAllElems(elem.contentDocument || elem.contentWindow.document); } catch(err) { /* CORS */ };
		}
	}
}

function handleMutations(mutations, observer) {
	if (!handleMutations.elems) handleMutations.elems=[];
	for (const mutation of mutations) {
		if (mutation.type === 'attributes') {
			handleMutations.elems.push(mutation.target);
		} else {
			for (const elem of mutation.addedNodes) if (elem.nodeType === Node.ELEMENT_NODE) handleMutations.elems.push(elem);
		}
	}

	clearTimeout(handleMutations.timeout);
	handleMutations.timeout = setTimeout(() => {
		observer.disconnect();
		convertCSS();
		handleMutations.elems.forEach(convertAllElems);
		handleMutations.elems.length=0;
		observer.connect();
	}, 500);
}

function whitebust(color) {
	function validNum(x) { return Number.isInteger(x) && x>=0 && x<=255; }

	if (!color) return;
	if (typeof color==='string') try { color=JSON.parse(color); } catch(err) { return; }
	if (!Array.isArray(color) || color.length!=3 || !validNum(color[0]) || !validNum(color[1]) || !validNum(color[2])) color=[255, 255, 255];

	if (!whitebust.alredyRun && (color[0]===255 && color[1] === 255 && color[2]===255)) return;

	document.documentElement.style.setProperty('--whitebusterR', String(color[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(color[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(color[2]));

	if (whitebust.alredyRun) return;
	whitebust.alredyRun=true;

	convertCSS();
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