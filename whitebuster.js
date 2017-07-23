(function () { 

const hex = "f5f5f5";

const hexRGBArray = hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
const hexRGBAprefix = hexRGBArray[0] + ', ' + hexRGBArray[1] + ', ' + hexRGBArray[2];

// replace all case insensitive
function ra(str, strReplace, strWith) {
	return str.replace(new RegExp(strReplace.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig'), strWith);
}

function addCSSclass(rules) {
	const style = document.createElement("style");

	style.appendChild(document.createTextNode("")); // WebKit hack :(
	document.head.appendChild(style);
	const sheet = style.sheet;

	rules.forEach((rule, index) => {
		try {
				sheet.insertRule(rule.selector + "{" + rule.rule + "}", index);
		} catch (e) {
				// firefox can break here          
		}
	})
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

function convertColorStr(str) {
	// replace all case insensitive
	s=ra(str, 'rgba(255, 255, 255', 'rgba(' + hexRGBAprefix);
	s=ra(s, 'rgb(255, 255, 255)', '#' + hex);
	s=ra(s, 'white', '#' + hex);
	s=ra(s, '#FFFFFF', '#' + hex);
	s=ra(s, '#FFF', '#' + hex);
	//if (s!==str) console.log(str + ' => ' + s +'\n');
	return s;
}

function convertBody() {
	addCSSclass([{
		selector: '.whiteBuster',
		rule: 'background-color: #' + hex
	}]);
	toggleClass(document.body, 'whiteBuster', true, true);
}

function convertCSS() {
	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type !== 1 || !cssRule.style) continue;
			const r=cssRule.style.cssText;
			if (!r.startsWith('background: ') && !r.startsWith('background-color: ')) continue;
			const s=convertColorStr(r);
			if (s !== r) cssRule.style.cssText = s;
		}
	}
}

function convertElem(elem) {
	try {
		const bg = 'background-color: ' + window.getComputedStyle(elem, null).getPropertyValue('background-color');
		if (convertColorStr(bg) !== bg) elem.style.backgroundColor = '#' + hex;
	} catch (e) {
		// swallow error
	}
}

function convertAllElems() {
	for (elem of document.getElementsByTagName("*")) convertElem(elem);
}

function convertMutated() {
	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			for (elem of mutation.addedNodes) convertElem(elem);
		});
	});
	observer.observe(document, { attributes: true, childList: true, characterData: true, subtree:true });
}

convertBody();
convertCSS();
convertAllElems();
convertMutated();

})();
