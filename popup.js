(function () { 
'use strict';

const lis=Array.from(document.getElementsByTagName("LI")),
	inputs=Array.from(document.getElementsByTagName("INPUT")),
	customLi=document.getElementById('custom');

function activateLi(theLi) {
	function activateOneLi(li, activate) {
		if (li.tagName!='LI') li=li.closest('li');
		li.firstChild.disabled=!activate;
		li.style.opacity=activate ? '' : '0.6';
		li.style.listStyleType=activate ? 'disc' : 'circle';
		li.style.fontWeight=activate ? 'bold' : 'normal';
	}

	lis.forEach(li2 => activateOneLi(li2, false));
	activateOneLi(theLi, true);

	inputs.forEach(inp => {
		inp.disabled=false;
		inp.readOnly= theLi!==customLi;
	});

	if (theLi===customLi) inputs[0].focus();
}

function parseColor(s) {
	function validNum(x) { return Number.isInteger(x) && x>=0 && x<=255; }
	let color;
	try { color=JSON.parse(s); } catch(err) { color=[255, 255, 255]; }
	if (!Array.isArray(color) || color.length!=3 || !validNum(color[0]) || !validNum(color[1]) || !validNum(color[2])) color=[245, 245, 245];
	return color;
}


function load() {
	chrome.storage.sync.get(null, storage => {
		let color=parseColor(storage.color), customColor=parseColor(storage.customColor);
		customLi.dataset.color=JSON.stringify(storage.customColor);
		inputs[0].value=String(customColor[0]);
		inputs[1].value=String(customColor[1]);
		inputs[2].value=String(customColor[2]);

		let selected;
		if (color[0]===color[1]===color[2]===255) {
			selected=lis[lis.length-1];
		} else {
			lis.forEach(li => {
				const liColor=parseColor(li.dataset.color);
				if (!selected && liColor[0]===color[0] && liColor[1]===color[1] && liColor[2]===color[2]) selected=li;
				li.style.backgroundColor='rgb('+liColor[0]+','+liColor[1]+','+liColor[2]+')';
			});
		}

		if (!selected) selected=lis[0];
		activateLi(selected);
	});
}

function save() {
	let selected;
	lis.forEach(li => { if (li.firstChild.disabled===false) selected=li; });
	if (!selected) selected=lis[0];

	const o={'color': selected.dataset.color}
	chrome.storage.sync.set(o);

	chrome.tabs.query({}, tabs => {
		tabs.forEach(tab => {
			chrome.tabs.sendMessage(tab.id, o);
		});
	});
}

function liClicked(li) {
	if (li.tagName!='LI') li=li.closest('li');
	activateLi(li); 
	save();
}

function hookEvents() {
	lis.forEach(li => li.addEventListener('click', e => liClicked(e.target)));
	lis.forEach(li => li.firstChild.addEventListener('click', e => liClicked(e.target)));

	inputs.forEach(inp => inp.addEventListener('click', e => {
		activateLi(customLi);
		e.stopPropagation();
		e.target.focus();
	}));

	inputs.forEach(inp => inp.addEventListener('input', e => {
		const inp=e.target, old=inp.dataset.old;
		if (Number(inp.value>255)) inp.value=old ? old : '245';
		inp.dataset.old=inp.value; 

		const v1=inputs[0].value, v2=inputs[1].value, v3=inputs[2].value;
		customLi.dataset.color=JSON.stringify([Number(v1), Number(v2), Number(v3)]);
		chrome.storage.sync.set({'customColor': customLi.dataset.color});
		customLi.style.backgroundColor='rgb('+v1+','+v2+','+v3+')';

		save();
	}));
}

load();
hookEvents();

})();