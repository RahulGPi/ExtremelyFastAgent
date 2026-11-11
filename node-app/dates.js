const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function parts(date, zone) {
 const entries = new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(date);
 return Object.fromEntries(entries.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
}
// Resolve a local midnight by iterating the timezone offset; the next midnight
// is resolved independently because a local day can cross a DST transition.
function midnight(year, month, day, zone) {
 const target=Date.UTC(year,month-1,day); let value=target;
 for(let i=0;i<4;i++) { const p=parts(new Date(value),zone); const local=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second); const next=value+(target-local); if(next===value) break; value=next; }
 const p=parts(new Date(value),zone);
 if(p.year!==year || p.month!==month || p.day!==day || p.hour!==0 || p.minute!==0) return null;
 return new Date(value).toISOString();
}
export function resolveDay(question, now=new Date(), zone=Intl.DateTimeFormat().resolvedOptions().timeZone) {
 const today=parts(now,zone); let date;
 const match=question.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/i);
 const weekday=question.match(/\b(?:last\s+|on\s+)(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
 if(match){
  const month=months.indexOf(match[2].toLowerCase())+1, day=Number(match[1]); let year=match[3]?Number(match[3]):today.year;
  if(!match[3] && (month>today.month || (month===today.month && day>today.day))) year--;
  date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day) return {invalid:true};
 }else if(weekday){
  date=new Date(Date.UTC(today.year,today.month-1,today.day));
  let delta=(date.getUTCDay()-weekdays.indexOf(weekday[1].toLowerCase())+7)%7; if(!delta)delta=7;
  date.setUTCDate(date.getUTCDate()-delta);
 }else return null;
 const year=date.getUTCFullYear(), month=date.getUTCMonth()+1, day=date.getUTCDate();
 const start=midnight(year,month,day,zone); date.setUTCDate(date.getUTCDate()+1);
 const end=midnight(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),zone);
 return start&&end?{start,end}:{invalid:true};
}
