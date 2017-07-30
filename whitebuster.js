(function () { 


	const hex = "f5f5f5";

	const hexRGBArray = hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
	const RGBAstr = 'rgba(' + hexRGBArray[0] + ', ' + hexRGBArray[1] + ', ' + hexRGBArray[2];
	const RGBstr = 'rgb(' + hexRGBArray[0] + ', ' + hexRGBArray[1] + ', ' + hexRGBArray[2] + ')';

	// Returns a function, that, when invoked, will only be triggered at most once
	// during a given window of time. Normally, the throttled function will run
	// as much as it can, without ever going more than once per `wait` duration;
	// but if you'd like to disable the execution on the leading edge, pass
	// `{leading: false}`. To disable execution on the trailing edge, ditto.
	function throttle(func, wait, options) {
		var timeout, context, args, result;
		var previous = 0;
		if (!options) options = {};

		var later = function () {
			previous = options.leading === false ? 0 : new Date().getTime();
			timeout = null;
			result = func.apply(context, args);
			if (!timeout) context = args = null;
		};

		var throttled = function () {
			var now = new Date().getTime();
			if (!previous && options.leading === false) previous = now;
			var remaining = wait - (now - previous);
			context = this;
			args = arguments;
			if (remaining <= 0 || remaining > wait) {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
				previous = now;
				result = func.apply(context, args);
				if (!timeout) context = args = null;
			} else if (!timeout && options.trailing !== false) {
				timeout = setTimeout(later, remaining);
			}
			return result;
		};

		throttled.cancel = function () {
			clearTimeout(timeout);
			previous = 0;
			timeout = context = args = null;
		};

		return throttled;
	}

	function convertBGstr(str, prefix) {
		prefix=prefix ? '(background(?:\\-color)?:[ ]?)' : '()';
		let regRgba = new RegExp(prefix + 'rgba\\((?:255, 255, 255|254, 254, 254)', 'ig');
		let regRgb = new RegExp(prefix +'(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))', 'ig');
	
		s=str.replace(regRgba, '$1'+RGBAstr);
		s=s.replace(regRgb, '$1'+RGBstr);

		//if (s!==str) console.log(str + ' => ' + s +'\n');
		return s;
	}

	function convertCSS() {
		for (const styleSheet of window.document.styleSheets) {
			const classes = styleSheet.rules || styleSheet.cssRules;
			if (!classes) continue;

			for (const cssRule of classes) {
				if (cssRule.type !== 1 || !cssRule.style) continue;
				const selector = cssRule.selectorText, declaration=cssRule.style.cssText;
				if (!selector || !declaration) continue;

				let s=convertBGstr(declaration, true);
				if (s !== declaration) cssRule.style.cssText = s;
			}
		}
	}

	function getBGcolor(elem) {
		try {
			return window.getComputedStyle(elem, null).getPropertyValue('background-color');
		} catch (e) {
			return '';
		}
	}

	function setBGcolor(elem, color=RGBstr) {
		try {
			elem.style.backgroundColor = color;
		} catch (e) {
			/* swallow error */
		}
	}


	function convertElem(elem) {
		if (!elem.style) return;
		const body=(elem===document.body);
		let bg = elem.style.backgroundColor;
		if (!body && (bg === undefined || bg === RGBstr || bg.startsWith(RGBAstr) || bg === 'transparent' || bg.startsWith('rgba(0, 0, 0, 0)'))) {
			// nothing to do
		} else if (body || !bg) {
			bg = getBGcolor(elem, null);
			if (bg && convertBGstr(bg, false) !== bg) setBGcolor(elem);
		} else if (convertBGstr(bg, false) !== bg) {
			setBGcolor(elem);
		}
	}

	function convertAllElems(root=document) {
		if (!root.getElementsByTagName) return;

		for (elem of root.getElementsByTagName('*')) {
			if (elem.tagName==='IFRAME') {
				try { convertAllElems(elem.contentDocument); } catch(e) {};
			} else {
				convertElem(elem);
			}
		}
	}		

	function handleMutation(mutations) {
		mutations.forEach(mutation => {
			for (elem of mutation.addedNodes) {
				convertElem(elem);
				convertAllElems(elem);
			}
		});
	}
	const throttledHandleMution = throttle(handleMutation, 200);
	
	function convertMutated() {
		const observer = new MutationObserver(mutations => throttledHandleMution(mutations));
		observer.observe(document, { childList: true, subtree:true });
	}

	convertCSS();
	convertAllElems();
	convertMutated();
})();
