for(let i=0;i<100;i++){
 try{const response=await fetch('http://127.0.0.1:4170/suite/status',{signal:AbortSignal.timeout(500)});if(response.ok&&(await response.json()).apps.every(app=>app.ready))process.exit(0)}catch{}
 await new Promise(ok=>setTimeout(ok,200));
}
console.error('La suite no está preparada');process.exit(1);
