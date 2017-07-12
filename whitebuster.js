const hex = "f5f5f5";

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


function convertBody() {
	addCSSclass([{
		selector: '.whiteBuster',
		rule: 'background-color: #' + hex
	}]);
	toggleClass(document.body, 'whiteBuster', true, true);
}

function convertCSS() {
	const hexToRGBArray = hex => hex.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16));
	const RGBArray = hexToRGBArray(hex)
	const prefix = RGBArray[0] + ', ' + RGBArray[1] + ', ' + RGBArray[2];

	for (const styleSheet of window.document.styleSheets) {
		const classes = styleSheet.rules || styleSheet.cssRules;
		if (!classes) continue;

		for (const cssRule of classes) {
			if (cssRule.type === 1 && !!cssRule.style) {
				const cssText = cssRule.style.cssText.replace('background: rgba(255, 255, 255', 'background: rgba(' + prefix)
					.replace('background-color: rgba(255, 255, 255', 'background-color: rgba(' + prefix)
					.replace('background: rgb(255, 255, 255', 'background: rgb(' + prefix)
					.replace('background-color: rgb(255, 255, 255', 'background: rgb(' + prefix)
					.replace('background: white', 'background: #' + hex)
					.replace('background-color: white', 'background: #' + hex);
				if (cssText !== cssRule.style.cssText) cssRule.style.cssText = cssText;
			}
		}
	}
}

function convertElem(elem) {
	try {
		const bg = window.getComputedStyle(elem, null).getPropertyValue('background-color');
		if (bg === 'rgb(255, 255, 255)') elem.style.backgroundColor = '#' + hex;
	} catch (e) {
		// swallow error
	}
}

convertBody();
convertCSS();

for (elem of document.getElementsByTagName("*")) convertElem(elem);

let observer = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		for (elem of mutation.addedNodes) convertElem(elem);
	})
});
observer.observe(document, { attributes: true, childList: true, characterData: true, subtree:true });
