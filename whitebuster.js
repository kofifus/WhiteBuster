(function () {
'use strict';

if (window.WHITEBUSTERINJECTED) return;
window.WHITEBUSTERINJECTED = true;

//const frameid=Date.now();

let observer;

const hookObserver = withAttributes => {
	if (observer) observer.disconnect();
	observer = new MutationObserver(handleMutations);
	observer.options = { childList: true, subtree: true, attributes: !!withAttributes };
	observer.isConnected = false; 
	observer.connect = function () { this.observe(document, observer.options); this.isConnected = true; };
	const orgDisconnect = observer.disconnect;
	observer.disconnect = function() { orgDisconnect.call(this); this.isConnected = false; }
	observer.connect();
}
const oConnect = () => { if (observer && !observer.isConnected) { observer.connect(); return true; } else { return false; }};
const oDisconnect = () => { if (observer && observer.isConnected) { observer.disconnect(); return true; } else { return false; }};

const parseColor = c => {
	if (!c) return null;
	if (typeof c === 'string') try { c = JSON.parse(c); } catch (err) { return null; }
	if (!Array.isArray(c) || c.length != 3 ||
		!Number.isInteger(c[0]) || c[0] < 0 || c[0] > 255 ||
		!Number.isInteger(c[1]) || c[1] < 0 || c[1] > 255 ||
		!Number.isInteger(c[2]) || c[2] < 0 || c[2] > 255) return null;
	return c;
}

const setColor = (color) => {
	if (!(color=parseColor(color))) return;

	const disconnected=oDisconnect();
	document.documentElement.style.setProperty('--whitebusterR', String(color[0]));
	document.documentElement.style.setProperty('--whitebusterG', String(color[1]));
	document.documentElement.style.setProperty('--whitebusterB', String(color[2]));
	if (disconnected) oConnect();
}

const convertBGstr = (str) => {
	const F = convertBGstr; F.F = F.F || !!Object.assign(F, {
		RGBarr: ['white', '#fff', '#ffffff', '#fefefe', 'rgb(255, 255, 255)', 'rgb(254, 254, 254)'],
		RGBAarr: ['rgba(255, 255, 255,', 'rgba(254, 254, 254,'],
		transparentArr: ['transparent', 'rgba(0, 0, 0, 0)', 'initial'],

		// case insensitive replace where 'f' is surrounded by non alnum chars
		isAlnumChar: c => (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'),
		replace: (s, f, r) => {
			const lcs = s.toLowerCase(), lcf = f.toLowerCase(), flen = f.length;
			let res = '', pos = 0, next = lcs.indexOf(lcf, pos);
			if (next === -1) return s;

			do {
				if ((next === 0 || !F.isAlnumChar(s[next - 1])) && (next + flen === s.length || !F.isAlnumChar(s[next + flen]))) {
					res += s.substring(pos, next) + r;
				} else {
					res += s.substring(pos, next + flen);
				}
				pos = next + flen;
			} while ((next = lcs.indexOf(lcf, pos)) !== -1);
			return res + s.substring(pos);
		}
	});

  //const orgStr=str;

	F.RGBarr.forEach(f => str = F.replace(str, f, 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB), 1)'));
	F.RGBAarr.forEach(f => str = F.replace(str, f, 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),'));
	
	// change transparent to something that will not be returned as 'rgba(0, 0, 0, 0)' from getComputedStyle
	F.transparentArr.forEach(f => str = F.replace(str, f, 'rgba(1, 1, 1, 0)'));

	//if (str!=orgStr) console.log(orgStr + ' => '+ str);
	return str;
}

const convertCSS = () => {
	const F = convertCSS; F.F = F.F || !!Object.assign(F, {
		nSheets: 0
	});

	if (F.nSheets === window.document.styleSheets.length) return;
	F.nSheets = window.document.styleSheets.length;

	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type !== 1 || !cssRule.style) continue;
			const selector = cssRule.selectorText, style = cssRule.style;
			if (!selector || !style.cssText) continue;
			for (let i = 0; i < style.length; i++) {
				const propertyName = style.item(i);
				const propertyValue = style.getPropertyValue(propertyName);
				if (propertyName === 'background-color'
					|| (propertyName === 'background-image' && (propertyValue.startsWith('linear-gradient') || propertyValue.startsWith('radial-gradient') || propertyValue.startsWith('repeating-linear-gradient') || propertyValue.startsWith('repeating-radia-gradient')))) {
					const newValue = convertBGstr(propertyValue);
					if (newValue !== propertyValue) cssRule.style.setProperty(propertyName, newValue, style.getPropertyPriority(propertyName));
				}
			}
		}
	}
}

const convertAllElems = root => {
	const F = convertAllElems; F.F = F.F || !!Object.assign(F, {
		calcBGcolor: (elem, cstyle) => {
			while (true) {
				let cbg=cstyle.getPropertyValue('background-color');
				if (cbg && cbg!='rgba(0, 0, 0, 0)') return cbg;
				elem = elem.parentElement;
				if (!elem || elem===document.documentElement) return '';
				cstyle = window.getComputedStyle(elem);
			}
		},

		convertElem: elem => {
			try { elem.style; } catch (e) { return; /* CORS */ };
			if (elem instanceof SVGElement) return;

			let bg = elem.style.backgroundColor, bi = elem.style.backgroundImage;
			if (/*document.readyState == 'complete' &&*/ (!bg || !bi)) { 
				const cs = window.getComputedStyle(elem);
				if (!bg) bg = F.calcBGcolor(elem, cs);
				if (!bi) bi = cs.getPropertyValue('background-image');
			}
			if (!bi.startsWith('linear-gradient') && !bi.startsWith('radial-gradient') && !bi.startsWith('repeating-linear-gradient') && !bi.startsWith('repeating-radial-gradient')) bi = '';

			if (bg) {
				const newbg = convertBGstr(bg);
				if (newbg !== bg) elem.style.backgroundColor = newbg;
			}

			if (bi) {
				const newbi = convertBGstr(bi);
				if (newbi !== bi) elem.style.backgroundImage = newbi;
			}

			if (elem && elem.tagName === 'IFRAME') try { convertAllElems(elem.contentDocument || elem.contentWindow.document); } catch (err) { /* CORS */ };
		}
	});

	if (!root) return;
	try { root.style; } catch (e) { return; /* CORS */ };

	const disconnected=oDisconnect();
	//const now=performance.now();
	F.convertElem(root);
	if (root.getElementsByTagName) {
		for (const elem of root.getElementsByTagName('*')) F.convertElem(elem);
	}
	if (disconnected) oConnect();
	//console.log('t: '+(performance.now()-now));
}

const convertRoot = () => {
	const F = convertRoot; F.F = F.F || !!Object.assign(F, {
		// If newState is provided add/remove theClass accordingly, otherwise toggle theClass
		toggleClass: (elem, theClass, newState, first = false) => {
			const matchRegExp = new RegExp('(?:^|\\s)' + theClass + '(?!\\S)', 'g');
			const add = (arguments.length > 2 ? !!newState : (elem.className.match(matchRegExp) == null));
			elem.className = elem.className.replace(matchRegExp, ''); // clear all
			if (add) {
				if (first) elem.className = theClass + ' ' + elem.className; else elem.className += ' ' + theClass;
			}
		}
	});

	let head;
	try { head=document.head; } catch(e) { return false; }
	F.toggleClass(document.documentElement, 'whiteBuster', true, true);
	return true;
}

const handleMutations = (mutations, observer) => {
	const F = handleMutations; F.F = F.F || !!Object.assign(F, {
		elems: [],
		timeout: null,
		
		rootConverted: (() => {
			let top;
			try { top=window.top.document.documentElement; } catch(e) { /*CORS */ }; 
			return top!==document.documentElement; // we only convert the root of the topmost frame
		})(), 

		process: () => {
			convertCSS();
			if (!F.rootConverted) F.rootConverted=convertRoot();
			F.timeout = null;
			if (F.elems.length === 0) return;
			const disconnected = oDisconnect();
			F.elems.forEach(convertAllElems);
			F.elems.length = 0;
			if (disconnected) oConnect();
		}
	});

	for (const mutation of mutations) {
		if (mutation.type === 'attributes') {
			F.elems.push(mutation.target);
		} else {
			for (const elem of mutation.addedNodes) {
				if (elem.nodeType !== Node.ELEMENT_NODE || !elem.style) continue;
				F.elems.push(elem);
			}
		}
	}
	if (F.elems.length === 0) return;

	if (!F.timeout) {
		F.process();
		if (document.readyState !== 'loading') F.timeout = setTimeout(() => F.process(), 300);
	}
}

// start

chrome.storage.sync.get(null, storage => { 
	if (chrome.runtime.lastError) return;
	const color=parseColor(storage.color);
	if (!color) return;
	
	if (color[0]==255 && color[1]==254 && color[2]==255) return;

	hookObserver(false);
	setColor(color);
	convertAllElems(document.documentElement); // we already got some elements

	if (document.readyState === 'complete') {
		hookObserver(true);
		convertAllElems(document.documentElement); 
	} else {
		document.onreadystatechange = () => {
			// in case some CORS css changed after elements mutation handled before so converAllElems, do this also on 'interactive' for better response
			convertAllElems(document.documentElement); 
			if (document.readyState === 'complete') hookObserver(true); // we now want to observe attribute changes as well
		};
	}
});

chrome.runtime.onMessage.addListener(msg => {
	if (chrome.runtime.lastError) return;
	const color=parseColor(msg.color);
	if (!color) return;

	hookObserver(true);
	setColor(color);
	convertAllElems(document.documentElement);
});


})();