function onpromptload() {
	var w=(screen.availWidth/2)-(document.getElementById('vixen-dialog').width/2);
	var h=(screen.availHeight/2)-(document.getElementById('vixen-dialog').height/2);
	window.moveTo(w,h);
 	document.getElementById("vixen-dialog-description").value = window.arguments[0].promptparams.description;
}
function closeprompter() {
   window.arguments[0].out = {enabled:'1'};
   return true;
}