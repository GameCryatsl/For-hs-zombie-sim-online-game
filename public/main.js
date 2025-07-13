const ws = new WebSocket(`ws://${location.host}`);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let id, name, type;
let players = {}, timer=0;
let vx=0, vy=0;

ws.onmessage = e => {
  const d = JSON.parse(e.data);
  if (d.type==='full') alert('Full, try later');
  if (d.type==='welcome') {
    name = d.name;
    document.getElementById('join').style.display='none';
    document.getElementById('hud').style.display='block';
  }
  if (d.type==='state') {
    timer = d.timer;
    d.players.forEach(p => players[p.id] = p);
  }
  if (d.type==='end') {
    document.getElementById('end').innerText = d.message + '\n' + 
      d.results.map(r=>`${r.name}(${r.type}): ${r.score}`).join('\n');
    document.getElementById('end').style.display='block';
  }
};

function join() {
  const n = document.getElementById('name').value.trim();
  if (n) ws.send(JSON.stringify({ type:'name', name: n }));
}

document.addEventListener('keydown', e => {
  if (e.key==='w') vy=-2;
  if (e.key==='s') vy=2;
  if (e.key==='a') vx=-2;
  if (e.key==='d') vx=2;
});

document.addEventListener('keyup', e => {
  if (['w','s'].includes(e.key)) vy=0;
  if (['a','d'].includes(e.key)) vx=0;
});

function draw() {
  ctx.clearRect(0,0,800,600);
  Object.values(players).forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x,p.y,5,0,2*Math.PI);
    ctx.fillStyle = p.type==='zombie' ? 'green' : 'skyblue';
    ctx.fill();
    if (p.name) ctx.fillText(p.name, p.x+6, p.y-6);
  });
  if (players) {
    const me = Object.values(players).find(p=>p.name===name);
    if (me) {
      ws.send(JSON.stringify({ type:'move', id:me.id, x:me.x+vx, y:me.y+vy }));
      me.x += vx; me.y += vy;
    }
  }
  document.getElementById('timer').innerText = `Time: ${timer}`;
  requestAnimationFrame(draw);
}

draw();
