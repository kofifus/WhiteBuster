(function () { 
	'use strict';

	const hex = 'f5f5f5';

	const hexRGBArray = hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
	const RGBAstr = 'rgba(' + hexRGBArray[0] + ', ' + hexRGBArray[1] + ', ' + hexRGBArray[2];
	const RGBstr = 'rgb(' + hexRGBArray[0] + ', ' + hexRGBArray[1] + ', ' + hexRGBArray[2] + ')';

	function convertBGstr(str) {
		let regRgba = new RegExp('rgba\\((?:255, 255, 255|254, 254, 254)', 'ig');
		let regRgb = new RegExp('(?:white|#fff(?:fff)?|#fefefe|rgb\\(255, 255, 255\\)|rgb\\(254, 254, 254\\))', 'ig');
	
		let s=str.replace(regRgba, RGBAstr);
		s=s.replace(regRgb, RGBstr);

		//if (s!==str) console.log(str + ' => ' + s +'\n');
		return s;
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

	function convertCSS(f) {
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

	function setBGcolor(elem, color=RGBstr) {
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
			if ((!bg && !cbg) || isTransparent(cbg) || convertBGstr(cbg) !== cbg) setBGcolor(elem);
		} else if (bg === RGBstr || bg.startsWith(RGBAstr) || isTransparent(bg)) {
			// nothing to do
		} else if (!bg) {
			let cbg=getBGcolor(elem, null);
			if (cbg && convertBGstr(cbg) !== cbg) setBGcolor(elem);
		} else {
			if (convertBGstr(bg) !== bg) setBGcolor(elem);
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


	convertCSS();
	convertAllElems();

	const observer = new MutationObserver(handleMutations);
	observer.connect=function() { this.observe(document, { childList: true, subtree:true, attributes: true }); };
	observer.connect();
})();
