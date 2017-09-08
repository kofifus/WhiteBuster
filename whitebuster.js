(function () {
	'use strict';

	if (window.WHITEBUSTERINJECTED) return;
	window.WHITEBUSTERINJECTED = true;

	let wbcolor = [255, 255, 255];
	let observer;

	const convertBGstr = (str) => {
		const S = convertBGstr.S || (convertBGstr.S = {
			RGBarr: ['white', '#fff', '#ffffff', '#fefefe', 'rgb(255, 255, 255)', 'rgb(254, 254, 254)'],
			RGBstr: 'rgb(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB))',

			RGBAarr: ['rgba(255, 255, 255,', 'rgba(254, 254, 254,'],
			RGBAstr: 'rgba(var(--whitebusterR), var(--whitebusterG), var(--whitebusterB),',

			// changing transparent to something that will not be returned as 'rgba(0, 0, 0, 0)' from getComputedStyle
			RGBAtransparentArr: ['rgba(0, 0, 0, 0)', 'transparent', 'initial'],
			RGBAtransparentStr: 'rgba(74, 141, 239, 0)',

			isAlnumChar: c => (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'),

			// case insensitive replace where 'f' is surrounded by non alnum chars
			replace: (s, f, r) => {
				const lcs = s.toLowerCase(), lcf = f.toLowerCase(), flen = f.length;
				let res = '', pos = 0, next = lcs.indexOf(lcf, pos);
				if (next === -1) return s;

				do {
					if ((next === 0 || !S.isAlnumChar(s[next - 1])) && (next + flen === s.length || !S.isAlnumChar(s[next + flen]))) {
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
		S.RGBarr.forEach(f => str = S.replace(str, f, S.RGBstr));
		S.RGBAarr.forEach(f => str = S.replace(str, f, S.RGBAstr));
		S.RGBAtransparentArr.forEach(f => str = S.replace(str, f, S.RGBAtransparentStr));
		//if (str!=orgStr) console.log(orgStr + ' => '+ str);
		return str;
	}

	const parseColor = c => {
		if (!c) return [255, 255, 255];
		if (typeof c === 'string') try { c = JSON.parse(c); } catch (err) { return [255, 255, 255]; }
		if (!Array.isArray(c) || c.length != 3 ||
			!Number.isInteger(c[0]) || c[0] < 0 || c[0] > 255 ||
			!Number.isInteger(c[1]) || c[1] < 0 || c[1] > 255 ||
			!Number.isInteger(c[2]) || c[2] < 0 || c[2] > 255) return [255, 255, 255];
		return c;
	}

	const loadColor = () => { try { return localStorage.getItem('whitebusterColor'); } catch (e) { return ''; /* CORS */ } };
	const saveColor = color => { try { localStorage.setItem('whitebusterColor', JSON.stringify(parseColor(color))); } catch (e) { /* CORS */ } };

	const setColor = (color) => {
		if (!color) color = loadColor();
		color = parseColor(color);
		if (wbcolor.every((v, i) => v === color[i])) return;
		wbcolor = color;
		saveColor(wbcolor);

		if (observer) observer.disconnect();
		document.documentElement.style.setProperty('--whitebusterR', String(wbcolor[0]));
		document.documentElement.style.setProperty('--whitebusterG', String(wbcolor[1]));
		document.documentElement.style.setProperty('--whitebusterB', String(wbcolor[2]));
		if (observer) observer.connect();
	}

	const convertCSS = () => {
		const S = convertCSS.S || (convertCSS.S = {
			nSheets: 0
		});

		if (S.nSheets === window.document.styleSheets.length) return;
		S.nSheets = window.document.styleSheets.length;

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

	const getCbgcolor = (elem, cstyle) => {
		const S = getCbgcolor.S || (getCbgcolor.S = {
			top: (() => { try { return window.top.document.documentElement; } catch(e) { return null; /* CORS */}})()
		});

		while (true) {
			let cbg=cstyle.getPropertyValue('background-color');
			if (cbg && cbg!='rgba(0, 0, 0, 0)') return cbg;
			if (elem===S.top) return 'white';
			elem = elem.parentElement;
			if (!elem) return '';
			cstyle = window.getComputedStyle(elem);
		}
	}

	const convertElemInternal = (elem) => {
		if (!elem || !elem.style || elem instanceof SVGElement) return;

		let bg = elem.style.backgroundColor, bi = elem.style.backgroundImage;
		if (!bg || !bi) {
			const cs = window.getComputedStyle(elem);
			if (!bg) bg = getCbgcolor(elem, cs);
			if (!bi) bi = cs.getPropertyValue('background-image');
		}
		if (!bi.startsWith('linear-gradient') && !bi.startsWith('radial-gradient') && !bi.startsWith('repeating-linear-gradient') && !bi.startsWith('repeating-radia-gradient')) bi = '';

		if (bg) {
			const newbg = convertBGstr(bg);
			if (newbg !== bg) elem.style.backgroundColor = newbg;
		}

		if (bi) {
			const newbi = convertBGstr(bi);
			if (newbi !== bi) elem.style.backgroundImage = newbi;
		}
	}

	const convertAllElems = root => {
		try { root.style; } catch (e) { return; /* CORS */ };

		if (!root) return;
		convertElem(root);
		if (root.getElementsByTagName) {
			for (const elem of root.getElementsByTagName('*')) convertElem(elem, true);
		}
	}

	const convertElem = elem => {
		try { elem.style; } catch (e) { return; /* CORS */ };

		convertElemInternal(elem, true);
		if (elem && elem.tagName === 'IFRAME') try { convertAllElems(elem.contentDocument || elem.contentWindow.document); } catch (err) { /* CORS */ };
	}

	const handleMutations = (() => {
		let elems = [];
		let timeout = null;

		const process = () => {
			timeout = null;
			if (elems.length === 0) return;
			if (observer && observer.options.attributes) observer.disconnect();
			elems.forEach(convertElem);
			elems.length = 0;
			if (observer && observer.options.attributes) observer.connect();
		};

		return (mutations, observer) => {
			convertCSS();

			for (const mutation of mutations) {
				if (mutation.type === 'attributes') {
					elems.push(mutation.target);
				} else {
					for (const elem of mutation.addedNodes) {
						if (elem.nodeType !== Node.ELEMENT_NODE || !elem.style) continue;
						elems.push(elem);
					}
				}
			}
			if (elems.length === 0) return;

			if (!timeout) {
				process();
				if (document.readyState !== 'loading') timeout = setTimeout(() => process(), 300);
			}
		};
	})();

	const hookOvserver = (withAttributes) => {
		if (observer) observer.disconnect();
		observer = new MutationObserver(handleMutations);
		observer.options = { childList: true, subtree: true, attributes: !!withAttributes };
		observer.connect = function () { this.observe(document, observer.options); };
		observer.connect();
	}

	setColor();

	convertElem(document.documentElement);
	hookOvserver(false);

	chrome.storage.sync.get(null, storage => { if (!chrome.runtime.lastError) setColor(storage.color); });

	chrome.runtime.onMessage.addListener(msg => {
		if (chrome.runtime.lastError) return;
		setColor(msg.color);
		if (msg.install) convertAllElems(document.documentElement);
	});

	document.onreadystatechange = () => {
		// in case some CORS css changed after elements mutation handled before so converAllElems 
		// do this also on 'interactive' for better response
		convertAllElems(document.documentElement); 

		if (document.readyState === "complete") hookOvserver(true); // we now want to observe attribute changes as well
	};

})();