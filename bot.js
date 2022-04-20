// Run dotenv
require('dotenv').config();
const {google} = require('googleapis');
const keys = require('./keys.json');
const Discord = require('discord.js');
let express = require('express');
const wakeUpDyno = require("./wokeDyno.js");
const DYNO_URL = "https://rosty.herokuapp.com"; 
let app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	wakeUpDyno(DYNO_URL);
    console.log(`Our app is running on port ${ PORT }`);
});
const client = new Discord.Client();
const gclient = new google.auth.JWT(
	keys.client_email, 
	null, 
	keys.private_key, 
	['https://www.googleapis.com/auth/spreadsheets']
);
gclient.authorize(function(err, tokens){
	if(err) {console.log(err); return;}
	else{
		console.log('connected my dude');
	}	
});
async function addSWORD(arr, values, Sstatus){
	arr.push(values);
	await updateSWORD(gclient, arr, Sstatus);
}
async function deleteSWORD(arr, name, Sstatus){
	arr = arr.filter(e=>e[0].trim()!=name.trim());
	await updateSWORD(gclient, arr, Sstatus);
}
async function changeSWORD(old, newname){
	let oldSstatus = '';
	let oldSstatusArr = [];
	let newSstatus = '';
	let newSstatusArr = [];
	let valuesOfSWORD = [];
	old = old.map(function(e){
		if((/^ epu $/i).test(e)) e = ' 00 ';
		if((/^ sql $/i).test(e)) e = ' -01 ';
    	return e;
	});

	if(old[2].substring(old[2].length-3) == ' TR') oldSstatus = 'Trainee';
	else oldSstatus = (+old[3]>3)? 'Enlisted' : 'NCO';
	oldSstatusArr = await getSWORDS(gclient, oldSstatus);
	console.log(oldSstatusArr);

	await deleteSWORD(oldSstatusArr, old[1], oldSstatus);
	for(let i = 0; i<oldSstatusArr.length; i++){
		oldSstatusArr[i][0] = oldSstatusArr[i][0].trim();
		if(oldSstatusArr[i][0] == old[1].trim()) {valuesOfSWORD = oldSstatusArr[i]; break;}
	}
	console.log(valuesOfSWORD);
	if(valuesOfSWORD.length==0){
		helpToFind(old[4], oldSstatusArr);
		return;
	}
	if((/ CK /i).test(old[5])){
		client.channels.get("515008673144111122").send(old[1] + ' - CKed');
		return;
	}

	if(old[2].substring(old[2].length-3) == ' TR' && !(/ out of tr /i).test(old[5])) newSstatus = 'Trainee';
	else newSstatus = (+old[5]>3)? 'Enlisted' : 'NCO';
	newSstatusArr = await getSWORDS(gclient, newSstatus); 
	console.log(newSstatus);
	if((/ out of tr /i).test(old[5])){
		client.channels.get("515008673144111122").send(old[1] + ' - is out of TR phase');
		valuesOfSWORD.pop();
		valuesOfSWORD[0] = newname;
		await addSWORD(newSstatusArr, valuesOfSWORD, newSstatus);
		return;
	}else{
		if(+old[3] > +old[5]){
			client.channels.get("515008673144111122").send('Promotion of ' + old[1] + ' to ' + newname + ' has been logged');
		}else if(+old[3] < +old[5]){
			client.channels.get("515008673144111122").send('Demotion of ' + old[1] + ' to ' + newname + ' has been logged');
		}
		valuesOfSWORD[0] = newname;
		await addSWORD(newSstatusArr, valuesOfSWORD, newSstatus);
		return;
	}
}
function helpToFind(name, arr){
	let reclast = new RegExp(/(.{4})$/gi);
	for(let i=0; i<arr.length; i++){
		if(name == arr[i][0].match(reclast)[0]){
			client.channels.get("515008673144111122").send('I couldn\'t find that guy, but maybe you were looking for ' + arr[i][0]);
			return;
		}
	}
	client.channels.get("515008673144111122").send('Who?');
}
async function getSWORDS(cl, Sstatus){
	const gsapi = google.sheets({version:'v4', auth: cl});
	const opt = {
		spreadsheetId: '1HXl_BDUfznyR1o1M2QfY_GzFc0e9uocZAJzupmlH_7o',
		range: Sstatus+'!A2:H'
	};
	let data = await gsapi.spreadsheets.values.get(opt);
	let dataarr = data.data.values;
	return dataarr;
}
async function updateSWORD(cl, values, Sstatus){
	const gsapi = google.sheets({version:'v4', auth: cl});
	await gsapi.spreadsheets.values.clear({
		spreadsheetId: '1HXl_BDUfznyR1o1M2QfY_GzFc0e9uocZAJzupmlH_7o',
		range: Sstatus+'!A2:H',
		resource: {},
		auth: gclient,
	});
	const resource = {
        values,
    };
	await gsapi.spreadsheets.values.update({
		spreadsheetId: '1HXl_BDUfznyR1o1M2QfY_GzFc0e9uocZAJzupmlH_7o',
		range: Sstatus+'!A2:H',
		valueInputOption: 'RAW',
		resource: resource
	});
	return;
}
async function checkSWORD(msg, roleId, Sstatus){
	let arrOfSWORD = await getSWORDS(gclient, Sstatus);
	console.log(arrOfSWORD);
	console.log('------------------------------');
	let arrOfMems = Array.from(msg.guild.members);
	let arrOfTags = [];
	for(let j=0; j<roleId.length; j++){
		for(let i = 0; i<arrOfMems.length; i++){
			if(arrOfMems[i][1]._roles.includes(roleId[j])){
				arrOfTags.push(arrOfMems[i][1].user.discriminator);
			}
		}
	}
	console.log(arrOfTags);
	console.log('------------------------------');	
	arrOfSWORD = arrOfSWORD.filter(e =>{
			if(arrOfTags.includes((/\d{4}/).exec(e[3])[0])) return true;
			client.channels.get("515008673144111122").send(e + ' - deleted from the roster');
	});
	console.log(arrOfSWORD);
	updateSWORD(gclient, arrOfSWORD, Sstatus);

}
let rec = new RegExp(/(^(.*)( \-?\d{2} | \w{3} )(.*)) ->( out of tr | \d{2} | sql | epu | CK | )(.*$)/, 'i');
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async function(msg){
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
  if(msg.member.roles.has("515009397135769610")){

    if(msg.content == '!updateRoster'){
    	await checkSWORD(msg, ['524620476643803136', '515009973395390465'], 'NCO'); 
    	await checkSWORD(msg, ['515010682475905025'], 'Enlisted');
    	await checkSWORD(msg, ['515029190676840489'], 'Trainee');
    }	
    else if(rec.test(msg.content.trim() + ' ')){
		let s = msg.content.trim() + ' ';
		let old = s.match(rec);
		old[6] = old[6].trim();
		console.log(old);
		if((/ CK /i).test(old[5])){
			changeSWORD(old, '')
		}
		else if((/ out of tr /i).test(old[5])){
			let newname = old[1];
			newname = newname.replace(' TR ', ' ');
			console.log(newname);
			changeSWORD(old, newname)
		}
		else{
			let newname =(old[6].length == 0 || old[6] == ' ') ? old[2] + old[5] + old[4] : old[2] + old[5] + old[6];
			changeSWORD(old, newname);
		}
    }

    
  }
});
client.on('guildMemberRemove', member => {
	// client.channels.get("515008673144111122").send('a member has fallen into the river');
	console.log(member);
})
client.login(process.env.DISCORD_TOKEN);
