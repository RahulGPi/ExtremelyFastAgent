import {openMemory,createSession,saveTurn} from '../node-app/memory.js';
import {resolveDay} from '../node-app/dates.js';
const path=process.argv[2];if(!path)throw Error('Provide a new evaluation database path');
const {existsSync}=await import('node:fs');if(existsSync(path))throw Error('Evaluation database already exists; choose a new path');
const db=openMemory(path);const now=new Date();
function seed(day,q,a){const range=resolveDay(day,now,'Asia/Kolkata');if(!range?.start)throw Error('Missing date '+day);const time=new Date(Date.parse(range.start)+12*3600000).toISOString();const session=createSession(db,time);saveTurn(db,session,'user',q,[],time);saveTurn(db,session,'assistant',a,[],new Date(Date.parse(time)+1000).toISOString());}
seed('on Monday','Please shortlist five CRM tools for our 20-person sales team.','Our shortlist was HubSpot, Salesforce, Pipedrive, Zoho CRM, and Freshsales. We did not record their prices at the time.');
seed('on 3 November','What is the capital of Japan?','Tokyo is the capital of Japan.');
seed('last Tuesday','Compare Postgres hosting from Neon and Supabase.','For this synthetic test, we recorded Neon at $19/month and Supabase at $25/month. These are test baselines, not verified historical prices.');
seed('last Friday','Compare Proton VPN and Mullvad VPN for privacy.','The shortlist was Proton VPN and Mullvad VPN. No prices were recorded.');
seed('last Thursday','Which task management tools should a small team consider?','Consider Asana and Trello.');
seed('on 2 November','What is the boiling point of water at sea level?','Water boils at 100 degrees Celsius at standard atmospheric pressure.');
db.close();console.log('Seeded six dated synthetic conversations.');
