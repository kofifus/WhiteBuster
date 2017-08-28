(function () { 
'use strict';

const RGBstr = 'rgb(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB))';
const RGBAstr = 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),';
const RGBreg = new RegExp('(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))');
const convertBGstr = str => {
	const s=str.toLowerCase().replace(RGBreg, RGBstr).replace('rgba(255, 255, 255,', RGBAstr).replace('rgba(254, 254, 254,', RGBAstr);
	return s===str ? '' : s;
}

function addCSSclass(rules) {
	const style = document.createElement("style");
	style.appendChild(document.createTextNode("")); // WebKit hack :(
	document.head.appendChild(style);
	const sheet = style.sheet;
	rules.forEach((rule, index) => { try { sheet.insertRule(rule.selector + "{" + rule.rule + "}", index); } catch (e) {}; });
}

// If newState is provided add/remove theClass accordingly, otherwise toggle theClass
function toggleClass(elem, theClass, newState, first = false) {
	const matchRegExp = new RegExp('(?:^|\\s)' + theClass + '(?!\\S)', 'g');
	const add = (arguments.length > 2 ? !!newState : (elem.className.match(matchRegExp) == null));

	elem.className = elem.className.replace(matchRegExp, ''); // clear all
	if (add) {
		if (first) elem.className = theClass + ' ' + elem.className;
		else elem.className += ' ' + theClass;
	}
}

function convertCSS() {
	let _=convertCSS.state; if (!_) _=convertCSS.state={
		nSheets: 0
	}

	if (_.nSheets===window.document.styleSheets.length) return;
	_.nSheets=window.document.styleSheets.length;

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
	let _=handleMutations.state; if (!_) _=handleMutations.state={
		process: () => {
			observer.disconnect();
			_.elems.forEach(convertAllElems);
			_.elems.length=0;
			_.lastRun=performance.now()
			observer.connect();
		},

		schedule: () => {
			clearTimeout(_.timeout);
			_.timeout = setTimeout(() => { if ((performance.now()-_.lastRun)<700) _.schedule(); else _.process(); }, 50);
		},

		elems: [],
		timeout: null,
		lastRun: performance.now()-600
	}

	for (const mutation of mutations) {
		if (mutation.type === 'attributes') {
			_.elems.push(mutation.target);
		} else {
			for (const elem of mutation.addedNodes) if (elem.nodeType === Node.ELEMENT_NODE) _.elems.push(elem);
		}
	}
	if (_.elems.length===0) return;

	convertCSS();
	_.schedule();
}

function whitebust(color) {
	let _=whitebust.state; if (!_) _=whitebust.state={
		validNum: n => { return Number.isInteger(n) && n>=0 && n<=255; },
		observer: null
	}

	if (!color) return;
	if (typeof color==='string') try { color=JSON.parse(color); } catch(err) { return; }
	if (!Array.isArray(color) || color.length!=3 || !_.validNum(color[0]) || !_.validNum(color[1]) || !_.validNum(color[2])) color=[255, 255, 255];

	if (!whitebust.alredyRun && (color[0]===255 && color[1] === 255 && color[2]===255)) return;

	if (_.observer) _.observer.disconnect();
	document.documentElement.style.setProperty('--whitebusterR', String(color[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(color[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(color[2]));
	if (_.observer) _.observer.connect();

	if (whitebust.alredyRun) return;
	whitebust.alredyRun=true;

	convertCSS();
	convertAllElems(document.documentElement);

	_.observer = new MutationObserver(handleMutations);
	_.observer.connect=function() { this.observe(document, { childList: true, subtree:true, attributes: true }); };
	_.observer.connect();
}

if (window.WHITEBUSTERINJECTED) return;
window.WHITEBUSTERINJECTED=true;

chrome.storage.sync.get(null, storage => { if (!chrome.runtime.lastError) whitebust(storage.color); });
chrome.runtime.onMessage.addListener(msg => { if (!chrome.runtime.lastError) whitebust(msg.color); });

})();