(function () { 
'use strict';

// lis: [ [li], [li], .., [li, 0, [inp1, inp2, inp3], [li, 1, [inp1, inp2, inp3], [li] ]
let lis; 


function activateLi(theLi) {
	function activateOneLi(li, activate) {
		li.firstChild.disabled=!activate;
		li.style.opacity=activate ? '' : '0.6';
		li.style.listStyleType=activate ? 'disc' : 'circle';
		li.style.fontWeight=activate ? 'bold' : 'normal';
	}

	lis.forEach(lia => activateOneLi(lia[0], false));
	activateOneLi(theLi, true);

	lis.forEach(lia => {
		if (lia.length===1) return; // not custom

		lia[2].forEach(inp => {
			inp.disabled=false;
			inp.readOnly= (theLi!==inp.closest('li'));
		});

		if (theLi===lia[0]) lia[2][0].focus();
	});
}

function liClicked(li) {
	if (li.tagName!='LI') li=li.closest('li');
	activateLi(li); 
	save();
}

function hookEvents() {
	lis.forEach(lia => {
		lia[0].addEventListener('click', e => liClicked(e.target));
		lia[0].firstChild.addEventListener('click', e => liClicked(e.target));

		if (lia.length===1) return; // not custom

		lia[2].forEach(inp => {
			inp.addEventListener('click', e => {
				const inp=e.target;
				e.stopPropagation();
				activateLi(inp.closest('li'));
				inp.focus();
			});

			inp.addEventListener('input', e => {
				const inp=e.target, old=inp.dataset.old, li=inp.closest('li'), inps=lis[lis.findIndex(lia => lia[0]===li)][2];
				if (Number(inp.value>255)) inp.value=old ? old : '245';
				inp.dataset.old=inp.value; 

				const v1=inps[0].value, v2=inps[1].value, v3=inps[2].value;
				li.dataset.color=JSON.stringify([Number(v1), Number(v2), Number(v3)]);
				li.style.backgroundColor='rgb('+v1+','+v2+','+v3+')';

				save();
			});
		});
	});
}

function parseColor(s) {
	function validNum(x) { return Number.isInteger(x) && x>=0 && x<=255; }
	let color;
	if (typeof s==='string') try { color=JSON.parse(s); } catch(err) { color=[245, 245, 245]; } else color=s;
	if (!Array.isArray(color) || color.length!=3 || !validNum(color[0]) || !validNum(color[1]) || !validNum(color[2])) color=[245, 245, 245];
	return color;
}

function load() {
	chrome.storage.sync.get(null, storage => {
		let color=parseColor(storage.color);
		lis.forEach(lia => {
			if (lia.length===1) return; // not custom

			let customColor=parseColor(storage['customColor'+lia[1]]);
			lia[0].dataset.color= JSON.stringify(customColor);
			lia[2].forEach((inp, i) => inp.value=customColor[i]);

			activateLi(lia[0]);
		});

		let selected;
		if (color[0]==color[1] && color[0]===color[2] && color[0]===255) selected=lis[lis.length-1][0];

		lis.forEach(lia => {
			const liColor=parseColor(lia[0].dataset.color);
			if (!selected && liColor[0]===color[0] && liColor[1]===color[1] && liColor[2]===color[2]) selected=lia[0];
			lia[0].style.backgroundColor='rgb('+liColor[0]+','+liColor[1]+','+liColor[2]+')';
		});

		if (!selected) selected=lis[0][0];
		activateLi(selected);

		hookEvents();
	});
}

function save() {
	let selected;
	lis.forEach(lia => { if (lia[0].firstChild.disabled===false) selected=lia[0]; });
	if (!selected) selected=lis[0][0];

	let o={'color': selected.dataset.color};
	lis.forEach(lia => { if (lia.length>1) o['customColor'+lia[1]]=lia[0].dataset.color; });

	chrome.storage.sync.set(o);

	chrome.tabs.query({}, tabs => {
		tabs.forEach(tab => {
			chrome.tabs.sendMessage(tab.id, o);
		});
	});
}

lis = Array.from(document.getElementById('colorList').getElementsByTagName("LI")).map(curr => [curr]);
let customIndex=0;
lis.forEach(lia => {
	let inps=Array.from(lia[0].getElementsByTagName("INPUT"));
	if (inps.length!==0) lia.push(customIndex++, inps);
});

load();

})();