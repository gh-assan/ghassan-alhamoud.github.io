/* Generic teaching scenes. Times are illustrative, with no hardware connection. */
(function(root){
'use strict';
function flowAt(t,kind){return {measured:t>=2,received:t>=5,requested:kind==='actuating'&&t>=8,applied:kind==='actuating'&&t>=11,observed:kind==='actuating'&&t>=14};}
function freshnessAt(t){var now=Math.min(10,Math.max(0,t));return {age:now,received:now>=9,evaluated:now>=10,usable:now<=5};}
root.IoTStudy={flowAt:flowAt,freshnessAt:freshnessAt};
if(!root.Motion)return;
var Motion=root.Motion,L=Motion.lib;
function label(s,str,x,y,size,color,maxW){size=size||14; var words=str.split(' '),line='',lines=[]; var o={size:size,color:color||'text',align:'left'}; maxW=maxW||s.w-x-18; words.forEach(function(word){var next=line?line+' '+word:word;if(line&&L.measure(s,next,o)>maxW){lines.push(line);line=word;}else line=next;});if(line)lines.push(line);lines.forEach(function(ln,i){L.text(s,ln,x,y+i*(size+5),o);});}
function box(s,x,y,w,h,title,detail,active){L.rr(s.g,x,y,w,h,9);s.g.fillStyle=L.col('bg2');s.g.fill();s.g.strokeStyle=L.col(active?'info':'border');s.g.lineWidth=active?2:1;s.g.stroke();label(s,title,x+14,y+25,15,'text',w-28);label(s,detail,x+14,y+51,13,'text2',w-28);}
function arrow(s,x1,y1,x2,y2,active){s.g.beginPath();s.g.moveTo(x1,y1);s.g.lineTo(x2,y2);s.g.lineWidth=2;s.g.strokeStyle=L.col(active?'info':'border');s.g.stroke();var a=Math.atan2(y2-y1,x2-x1);s.g.beginPath();s.g.moveTo(x2,y2);s.g.lineTo(x2-8*Math.cos(a-.4),y2-8*Math.sin(a-.4));s.g.lineTo(x2-8*Math.cos(a+.4),y2-8*Math.sin(a+.4));s.g.closePath();s.g.fillStyle=L.col(active?'info':'border');s.g.fill();}
function drawFlow(s,t){
var compact=s.w<680,margin=18,w=compact?s.w-36:(s.w-112)/3;
var kind=s.fig.dataset.kind||'sensing',v=flowAt(t,kind),x=[margin,compact?margin:margin+w+38,compact?margin:margin+2*(w+38)],y=compact?[80,211,342]:[128,128,128];
label(s,'ILLUSTRATIVE · '+(kind==='sensing'?'SENSING ONLY':'WITH OPTIONAL ACTUATION'),margin,30,12,'accent');
box(s,x[0],y[0],w,76,'Physical condition',v.observed?'New observation available':'Quantity of interest',v.measured||v.observed);
box(s,x[1],y[1],w,76,'Device',v.applied?'Operation applied':v.measured?'Observation acquired':'Awaiting observation',v.measured);
box(s,x[2],y[2],w,76,'Application',v.received?'Telemetry received':'Awaiting telemetry',v.received);
if(compact){arrow(s,margin+22,158,margin+22,204,v.measured);label(s,'Measurement',margin+38,181,13,'text2');arrow(s,margin+22,289,margin+22,335,v.received);label(s,'Telemetry via network',margin+38,313,13,'text2');}
else {arrow(s,x[0]+w+4,164,x[1]-5,164,v.measured);arrow(s,x[1]+w+4,164,x[2]-5,164,v.received);label(s,'Measure',x[0]+w-11,105,12,'text2');label(s,'Telemetry',x[1]+w-12,105,12,'text2');}
var lines=kind==='sensing'?(v.received?['Telemetry is available to the application.','No command or actuator is required.']:['Measurement precedes received telemetry.','No command or actuator is required.']):v.observed?['Feedback: relevant new observation.','The next decision can use that feedback.']:v.applied?['Optional actuation: equipment applies operation.','The outcome still needs relevant observation.']:v.requested?['Optional command: application requests operation.','Receipt and effect remain separate.']:['First: measure, then communicate.','Optional commands appear after receipt.'];
var yy=compact?458:283;label(s,lines[0],margin,yy,13,'info');label(s,lines[1],margin,yy+(compact?46:28),13,'text2');
if(!compact&&v.requested)arrow(s,x[2]-5,191,x[1]+w+4,191,true);
if(!compact&&v.applied)arrow(s,x[1]-5,191,x[0]+w+4,191,true);
}
function drawFreshness(s,t){var v=freshnessAt(t),compact=s.w<680,w=s.w-36;
label(s,'ILLUSTRATIVE · SYNCHRONIZED CLOCKS',18,30,12,'accent');
box(s,18,72,w,78,'Measured at 12:00:00','Permitted age: 5 seconds (assumed)',true);
label(s,'Observation age',18,191,15);label(s,v.age.toFixed(1)+' seconds',18,228,25,v.usable?'info':'warn');
L.rr(s.g,18,259,w,12,6);s.g.fillStyle=L.col('border');s.g.fill();L.rr(s.g,18,259,w*v.age/10,12,6);s.g.fillStyle=L.col(v.usable?'info':'warn');s.g.fill();
label(s,v.received?'Received at 12:00:09':'Telemetry has not arrived',18,314,14,'text2');
label(s,v.evaluated?'Evaluated at 12:00:10: too old':v.usable?'Within assumed age limit':'Beyond assumed age limit',18,349,14,v.usable?'info':'warn');
label(s,'Arrival does not reset measurement time.',18,compact?410:391,13,'text2');
}
function startPaused(s){s.paused=true;s.btn.setAttribute('aria-pressed','true');s.btn.setAttribute('aria-label','Play animation');s.btn.classList.add('scene__toggle--paused');}
Motion.register('iot-study-flow',{setup:startPaused,duration:18,poster:16,beats:[[0,'Setup'],[2,'Measurement'],[5,'Telemetry'],[8,'Optional command'],[11,'Optional actuation'],[14,'Feedback']],draw:drawFlow});
Motion.register('iot-study-freshness',{setup:startPaused,duration:14,poster:10,beats:[[0,'Measured'],[5.1,'Age limit passed'],[9,'Received'],[10,'Evaluated']],draw:drawFreshness});
})(typeof window==='undefined'?globalThis:window);
