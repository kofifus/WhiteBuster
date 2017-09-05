(function () { 
'use strict';

let wbcolor=[255, 255, 255];
let observer;

const RGBstr = 'rgb(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB))';
const RGBreg = new RegExp('(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))', 'ig');
const RGBAstr = 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),';
const RGBAreg = new RegExp('(?:rgba\\(255, 255, 255,|rgba\\(254, 254, 254,)', 'ig');

const convertBGstr = str => {
	const s=str.replace(RGBreg, RGBstr).replace(RGBAreg, RGBAstr);
	return s===str ? '' : s;
}

const parseColor = c => {
	if (!c) return [255, 255, 255];
	if (typeof c==='string') try { c=JSON.parse(c); } catch(err) { return [255, 255, 255]; }
	if (!Array.isArray(c) || c.length!=3 || 
		!Number.isInteger(c[0]) || c[0]<0 || c[0]>255 ||
		!Number.isInteger(c[1]) || c[1]<0 || c[1]>255 ||
		!Number.isInteger(c[2]) || c[2]<0 || c[2]>255) return [255, 255, 255];
	return c;
}

const setColor = (color) => {
	if (!color) color=localStorage.getItem('whitebusterColor');
	color=parseColor(color);
	if (wbcolor.every((v, i)=> v === color[i])) return;
	wbcolor=color;
	localStorage.setItem('whitebusterColor', JSON.stringify(parseColor(wbcolor)));

	if (observer) observer.disconnect();
	document.documentElement.style.setProperty('--whitebusterR', String(wbcolor[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(wbcolor[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(wbcolor[2]));	
	if (observer) observer.connect();
}

const convertCSS = () => {
	const S = convertCSS.S || (convertCSS.S = {
		nSheets: 0,
	});

	if (S.nSheets===window.document.styleSheets.length) return;
	S.nSheets=window.document.styleSheets.length;

	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type !== 1 || !cssRule.style) continue;
			const selector = cssRule.selectorText, style=cssRule.style;
			if (!selector || !style.cssText) continue;
			for (let i=0; i<style.length; i++) {
				const propertyName=style.item(i);
				const propertyValue=style.getPropertyValue(propertyName);
				if (propertyName==='background-color' 
						|| (propertyName==='background-image' && (propertyValue.startsWith('linear-gradient') || propertyValue.startsWith('radial-gradient') || propertyValue.startsWith('repeating-linear-gradient') || propertyValue.startsWith('repeating-radia-gradient')))) {
					const newValue=convertBGstr(propertyValue);
					if (newValue) cssRule.style.setProperty(propertyName, newValue, style.getPropertyPriority(propertyName));
				}
			}
		}
	}
}

const convertElemInternal = (elem) => {
	if (!elem || !elem.style || elem instanceof SVGElement) return;

	let bg=elem.style.backgroundColor, bi=elem.style.backgroundImage, newbg, newbi;
	if (!bg || !bi) {
		const cs=window.getComputedStyle(elem, null);
		if (!bg) bg=cs.getPropertyValue('background-color');
		if (!bi) bi=cs.getPropertyValue('background-image');
	}
	if (!bi.startsWith('linear-gradient') && !bi.startsWith('radial-gradient') && !bi.startsWith('repeating-linear-gradient') && !bi.startsWith('repeating-radia-gradient')) bi='';
 
 	if (bg) newbg=convertBGstr(bg);
	if (newbg) elem.style.backgroundColor = newbg;

 	if (bi) newbi=convertBGstr(bi);
	if (newbi) elem.style.backgroundImage = newbi;
}

const convertAllElems = root => {
	if (!root) return;

	convertElem(root);
	if (root.getElementsByTagName) {
		for (const elem of root.getElementsByTagName('*')) convertElem(elem, true);
	}
}

const convertElem = elem => {
	convertElemInternal(elem, true);
	if (elem && elem.tagName==='IFRAME') try { convertAllElems(elem.contentDocument || elem.contentWindow.document); } catch(err) { };
}


function handleMutations(mutations, observer) {
	const S = handleMutations.S || (handleMutations.S = {
		elems: [],
		timeout: null,
	});

	convertCSS();

	for (const mutation of mutations) {
		if (mutation.type === 'attributes') {
			S.elems.push(mutation.target);
		} else {
			for (const elem of mutation.addedNodes) {
				if (elem.nodeType!== Node.ELEMENT_NODE || !elem.style) continue;
				S.elems.push(elem);
			}
		}
	}
	
	if (S.elems.length> 0 && !S.timeout) S.timeout=setTimeout(() => {
		observer.disconnect();
		S.elems.forEach(convertElem);
		S.elems.length=0;
		S.timeout=null;
		observer.connect();
	}, 700);
}

if (window.WHITEBUSTERINJECTED) return;
window.WHITEBUSTERINJECTED=true;

setColor();

observer=new MutationObserver(handleMutations);
observer.connect = function() { this.observe(document, { childList: true, subtree:true, attributes: true }); };
observer.connect();

chrome.storage.sync.get(null, storage => { if (!chrome.runtime.lastError) setColor(storage.color); });

chrome.runtime.onMessage.addListener(msg => { 
	if (chrome.runtime.lastError) return; 
	setColor(msg.color); 
	if (msg.install) convertAllElems(document.documentElement); 
});

})();