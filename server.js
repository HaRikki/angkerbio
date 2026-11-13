const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2]})}catch{}
const PORT=process.env.PORT||3000,DATA=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data')),UP=path.join(DATA,'uploads'),DB=path.join(DATA,'content.json'),PUB=path.join(__dirname,'public');
if(!process.env.ADMIN_PASSWORD){console.error('ADMIN_PASSWORD is missing. Locally: put it in .env. On Render/Railway: add it under Environment → Environment Variables, then redeploy.');process.exit(1)}
const salt=crypto.randomBytes(16),hash=crypto.scryptSync(process.env.ADMIN_PASSWORD,salt,64);delete process.env.ADMIN_PASSWORD;
fs.mkdirSync(UP,{recursive:true});
const DEF={site:{title:'My Digital Universe',description:'Creative developer portfolio',animations:true},
profile:{name:'Your Name',identity:'Creative Full-Stack Developer',intro:'Edit this introduction from the admin dashboard.',location:'Your City',availability:'Available for projects',skills:'JavaScript, TypeScript, React, Node.js',philosophy:'Build things that feel alive.',avatar:'',heroBg:''},
anime:{title:'ENTER ANOTHER WORLD',text:'Upload an anime background image or video in the admin dashboard.',bg:''},
join:{title:'JOIN THE UNIVERSE',text:'Become part of the community.',button:'JOIN NOW',url:'#'},
projects:[{title:'Placeholder Project',description:'Replace with your real project from the admin dashboard.',image:'',category:'Web App',stack:'React, Node.js',live:'',github:''}],
songs:[],socials:[{label:'GitHub',url:'https://github.com'}]};
let content=DEF;try{content=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{save(DEF)}
function save(c){content=c;fs.writeFileSync(DB+'.tmp',JSON.stringify(c,null,1));fs.renameSync(DB+'.tmp',DB)}
const sess=new Map(),rl=new Map(),MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.m4a':'audio/mp4'};
const ip=r=>process.env.TRUST_PROXY==='1'?(r.headers['x-forwarded-for']||'').split(',')[0].trim()||r.socket.remoteAddress:r.socket.remoteAddress;
const json=(s,c,o)=>{s.writeHead(c,{'Content-Type':'application/json'});s.end(JSON.stringify(o))};
const cookie=r=>(r.headers.cookie||'').split(';').map(x=>x.trim().split('=')).find(x=>x[0]==='sid')?.[1];
const authed=r=>{const t=cookie(r),e=sess.get(t);if(e&&e>Date.now())return true;sess.delete(t);return false};
const body=(r,max=1e6)=>new Promise((ok,no)=>{let n=0;const b=[];r.on('data',d=>{n+=d.length;if(n>max){r.destroy();no()}else b.push(d)});r.on('end',()=>ok(Buffer.concat(b).toString()));r.on('error',no)});
function serve(req,res,file){fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end('Not found')}
const h={'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes'};
const m=(req.headers.range||'').match(/bytes=(\d*)-(\d*)/);
if(m){const a=m[1]?+m[1]:0,z=m[2]?+m[2]:st.size-1;if(a>z||z>=st.size){res.writeHead(416);return res.end()}
res.writeHead(206,{...h,'Content-Range':`bytes ${a}-${z}/${st.size}`,'Content-Length':z-a+1});return fs.createReadStream(file,{start:a,end:z}).pipe(res)}
res.writeHead(200,{...h,'Content-Length':st.size});fs.createReadStream(file).pipe(res)})}
const clean=c=>{const o={};for(const k of Object.keys(DEF)){const v=c[k];if(Array.isArray(DEF[k]))o[k]=Array.isArray(v)?v.slice(0,200).map(i=>({...Object.fromEntries(Object.keys(DEF[k][0]||{label:1,url:1,title:1,artist:1,cover:1,src:1}).map(f=>[f,String(i?.[f]??'').slice(0,2000)]))})):[];
else{o[k]={};for(const f of Object.keys(DEF[k]))o[k][f]=typeof DEF[k][f]==='boolean'?!!v?.[f]:String(v?.[f]??'').slice(0,5000)}}
o.songs=o.songs.map((s,i)=>({title:s.title,artist:s.artist,cover:s.cover,src:s.src}));return o};
http.createServer(async(req,res)=>{try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
const u=new URL(req.url,'http://x'),p=decodeURIComponent(u.pathname);
if(p==='/api/content')return json(res,200,content);
if(p.startsWith('/api/admin')){
if(req.method!=='GET'&&req.headers['x-requested-with']!=='admin')return json(res,403,{error:'forbidden'});
if(p==='/api/admin/login'&&req.method==='POST'){const k=ip(req),r=rl.get(k)||{n:0,t:Date.now()};if(Date.now()-r.t>9e5){r.n=0;r.t=Date.now()}
if(r.n>=5)return json(res,429,{error:'Too many attempts. Try again in 15 minutes.'});
let pw='';try{pw=String(JSON.parse(await body(req,1e4)).password||'')}catch{}
const h=crypto.scryptSync(pw,salt,64);if(!crypto.timingSafeEqual(h,hash)){r.n++;rl.set(k,r);return json(res,401,{error:'Wrong password'})}
rl.delete(k);const t=crypto.randomBytes(32).toString('hex');sess.set(t,Date.now()+8*36e5);
res.setHeader('Set-Cookie',`sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,200,{ok:1})}
if(!authed(req))return json(res,401,{error:'unauthorized'});
if(p==='/api/admin/me')return json(res,200,{ok:1});
if(p==='/api/admin/logout'){sess.delete(cookie(req));res.setHeader('Set-Cookie','sid=; HttpOnly; Path=/; Max-Age=0');return json(res,200,{ok:1})}
if(p==='/api/admin/content'&&req.method==='PUT'){save(clean(JSON.parse(await body(req))));return json(res,200,{ok:1})}
if(p==='/api/admin/upload'&&req.method==='POST'){const ext='.'+String(u.searchParams.get('ext')||'').toLowerCase().replace(/[^a-z0-9]/g,'');
if(!['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mp3','.ogg','.wav','.m4a'].includes(ext))return json(res,400,{error:'File type not allowed'});
const name=crypto.randomBytes(12).toString('hex')+ext,f=path.join(UP,name),ws=fs.createWriteStream(f);let n=0,bad=false;
req.on('data',d=>{n+=d.length;if(n>2e8&&!bad){bad=true;req.destroy();ws.destroy();fs.unlink(f,()=>{})}});
req.pipe(ws);ws.on('finish',()=>!bad&&json(res,200,{url:'/uploads/'+name}));return}
return json(res,404,{error:'not found'})}
if(p==='/admin1'||p==='/admin1/')return serve(req,res,path.join(PUB,'admin.html'));
if(p.startsWith('/uploads/')){const f=path.join(UP,path.basename(p));return serve(req,res,f)}
const f=path.join(PUB,p==='/'?'index.html':p);if(!f.startsWith(PUB+path.sep)||path.basename(f)==='admin.html')return json(res,404,{error:'not found'});
serve(req,res,f)}catch(e){try{json(res,500,{error:'server error'})}catch{}}}).listen(PORT,()=>console.log('Universe online → http://localhost:'+PORT+'  | admin: /admin1'));
