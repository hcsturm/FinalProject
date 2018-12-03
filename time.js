var today = new Date();
var mm = today.getMonth()+1;
var dd = today.getDate();
var yyyy = today.getFullYear();
var hh = today.getHours();
var m = today.getMinutes();

if(dd<10){
	dd='0'+dd;}
if(mm<10){
	mm='0'+mm;}
if(hh<10){
	hh='0'+hh;}
if(m<10){
	m='0'+m;}
today = mm+'-'+dd+'-'+yyyy+'/'+hh+':'+m;
	
	document.getElementById("date").innerHTML = today;
//Replace Time with current date/time

