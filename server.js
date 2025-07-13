const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MAX_PLAYERS = 50;
const INITIAL_ZOMBIES = 5;
const GAME_DURATION = 600; // 단위 초

const server = http.createServer((req, res) => {
  let file = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200);
    res.end(data);
  });
});
const wss = new WebSocket.Server({ server });

let players = [];
let gameStarted = false;
let timer = GAME_DURATION;

function getUniqueName(base, arr) {
  if (!arr.includes(base)) return base;
  let i = 1;
  while (arr.includes(`${base}(${i})`)) i++;
  return `${base}(${i})`;
}

function broadcast(data) {
  const j = JSON.stringify(data);
  players.forEach(p => p.ws.send(j));
}

function checkInfect() {
  players.filter(p => p.type==='zombie').forEach(z => {
    players.filter(h => h.type==='human').forEach(h => {
      const d = Math.hypot(z.x-h.x, z.y-h.y);
      if (d < 10) h.type = 'zombie';
    });
  });
}

function endGame(msg) {
  const results = players.map(p => ({
    name: p.name,
    type: p.type,
    score: ( (p.type==='human' && timer>0) || (p.type==='zombie' && players.filter(h=>h.type==='human').length===0) ) ? 1 : 0
  }));
  broadcast({ type:'end', message: msg, results });
  clearInterval(loop);
  gameStarted=false;
  players.forEach(p=>p.ws.close());
  players=[];
}

const loop = setInterval(()=>{
  if (!gameStarted) return;
  timer--;
  checkInfect();
  const humans = players.filter(p=>p.type==='human').length;
  if (humans===0) return endGame('Zombies win!');
  if (timer<=0) return endGame('Humans win!');
  broadcast({ type:'state', players: players.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,type:p.type})), timer });
},1000);

wss.on('connection', ws => {
  if (players.length>=MAX_PLAYERS || gameStarted) {
    ws.send(JSON.stringify({ type:'full' }));
    ws.close();
    return;
  }
  const player = { ws, id: Date.now() + Math.random(), x: Math.random()*800, y: Math.random()*600, type:'human', name:'' };
  players.push(player);

  ws.on('message', msg => {
    const d = JSON.parse(msg);
    if (d.type === 'name') {
      const arr = players.map(p=>p.name).filter(n=>n);
      player.name = getUniqueName(d.name, arr);
      ws.send(JSON.stringify({ type:'welcome', name: player.name }));
      if (players.length === MAX_PLAYERS) {
        gameStarted = true;
        timer = GAME_DURATION;
        for (let i=0; i<INITIAL_ZOMBIES; i++) {
          const c = players[Math.floor(Math.random()*players.length)];
          c.type = 'zombie';
        }
      }
    } else if (d.type === 'move') {
      player.x = d.x;
      player.y = d.y;
    }
  });

  ws.on('close', () => {
    players = players.filter(p => p.ws !== ws);
  });
});

server.listen(3000, () => console.log('Listening on port 3000'));

