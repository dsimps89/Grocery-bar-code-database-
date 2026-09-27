const ACCESS_CODE='1234';
let data=Store.load(), scanTimer=null, stream=null, detector=null, lastScanned='';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showApp(){ $('lock').hidden=true;$('app').hidden=false;renderAll() }
$('unlock').onclick=()=> $('pin').value===ACCESS_CODE?showApp():alert('Incorrect code');
$('pin').addEventListener('keydown',e=>{if(e.key==='Enter')$('unlock').click()});
$('lockBtn').onclick=()=>{stopScanner();location.reload()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.hidden=true);$(b.dataset.view).hidden=false;renderAll()});

function detectVariableWeight(code){
 // Retailer-generated UPC-A labels often use 2xxxx prefixes. Exact encoding varies by retailer.
 if(/^2\d{11}$/.test(code)) return 'This looks like a retailer-generated variable-measure UPC. Weight/price encoding differs by store, so V2 saves the full barcode but does not guess the embedded weight or price.';
 return '';
}
function fillKnown(code){const p=data.products[code];if(!p)return false;$('name').value=p.name||'';$('brand').value=p.brand||'';$('category').value=p.category||'';$('price').value=p.lastPrice??'';$('classType').value=p.type||'semi';return true}
function setBarcode(code){code=String(code||'').trim();if(!code)return;$('barcode').value=code;const msg=detectVariableWeight(code);$('variableNotice').hidden=!msg;$('variableNotice').textContent=msg;if(fillKnown(code)){$('lookupStatus').textContent='Recognized from your local database.'}else{$('lookupStatus').textContent='New barcode. Trying product lookup…';lookupProduct(code)}}
$('barcode').addEventListener('change',()=>setBarcode($('barcode').value));

async function lookupProduct(code=$('barcode').value.trim()){
 if(!code)return alert('Enter or scan a barcode first.');
 if(fillKnown(code)){ $('lookupStatus').textContent='Recognized from your local database.';return }
 $('lookupStatus').textContent='Looking up…';
 try{
  const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,categories`);
  if(!r.ok)throw new Error('Lookup service returned '+r.status);
  const j=await r.json();
  if(j.status===1&&j.product){const p=j.product;$('name').value=p.product_name||'';$('brand').value=p.brands||'';$('category').value=(p.categories||'').split(',')[0].trim();$('lookupStatus').textContent=p.product_name?'Product found. Confirm details, price and class.':'Barcode found, but product name is missing.'}
  else $('lookupStatus').textContent='No public match found. Enter it once and V2 will remember it.';
 }catch(e){$('lookupStatus').textContent='Online lookup unavailable. Enter the product manually; it will still be remembered.'}
}
$('lookupBarcode').onclick=()=>lookupProduct();

function savePurchase(){
 const code=$('barcode').value.trim(),name=$('name').value.trim();if(!code||!name)return alert('Barcode and product name are required.');
 const qty=Math.max(1,Number($('qty').value)||1),price=Math.max(0,Number($('price').value)||0),type=$('classType').value;
 data.products[code]={barcode:code,name,brand:$('brand').value.trim(),category:$('category').value.trim(),type,lastPrice:price,updated:new Date().toISOString()};
 data.transactions.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),barcode:code,date:new Date().toISOString(),quantity:qty,price});
 Store.save(data);clearForm();renderAll();$('scanStatus').textContent=`Saved ${name} × ${qty}. Ready for next item.`;
}
$('savePurchase').onclick=savePurchase;
function clearForm(){['barcode','name','brand','category','price'].forEach(id=>$(id).value='');$('qty').value=1;$('classType').value='semi';$('lookupStatus').textContent='';$('variableNotice').hidden=true;lastScanned=''}

async function startScanner(){
 if(!navigator.mediaDevices?.getUserMedia)return $('scanStatus').textContent='Camera access is unavailable. Use manual barcode entry.';
 if(!('BarcodeDetector' in window))return $('scanStatus').textContent='This browser does not provide BarcodeDetector. Use manual entry or try a compatible Chromium-based mobile browser.';
 try{
  const supported=await BarcodeDetector.getSupportedFormats();const wanted=['ean_13','ean_8','upc_a','upc_e','code_128'].filter(x=>supported.includes(x));detector=new BarcodeDetector({formats:wanted.length?wanted:undefined});
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});$('video').srcObject=stream;await $('video').play();$('scanStatus').textContent='Scanner running — point the camera at a barcode.';
  clearInterval(scanTimer);scanTimer=setInterval(async()=>{try{const codes=await detector.detect($('video'));const c=codes[0]?.rawValue;if(c&&c!==lastScanned){lastScanned=c;setBarcode(c);$('scanStatus').textContent='Scanned '+c+'. Confirm details and save.';stopScanner(false)}}catch{}},350);
 }catch(e){$('scanStatus').textContent='Camera error: '+e.message}
}
function stopScanner(update=true){clearInterval(scanTimer);scanTimer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('video').srcObject=null;if(update)$('scanStatus').textContent='Scanner stopped.'}
$('startCamera').onclick=startScanner;$('stopCamera').onclick=()=>stopScanner();

function renderProducts(){const arr=Object.values(data.products).sort((a,b)=>a.name.localeCompare(b.name));$('productList').innerHTML=arr.map(p=>`<div class="card ${p.type}"><b>${esc(p.name)}</b>${p.brand?` <small>— ${esc(p.brand)}</small>`:''}<br><span>${esc(p.barcode)} · ${esc(p.category||'Uncategorized')} · ${esc(p.type)} · last $${Number(p.lastPrice||0).toFixed(2)}</span></div>`).join('')||'<p>No products yet.</p>'}
function monthKey(d){return d.slice(0,7)}
function monthlySeries(code){const by={};data.transactions.filter(t=>t.barcode===code).forEach(t=>by[monthKey(t.date)]=(by[monthKey(t.date)]||0)+Number(t.quantity||0));return by}
function forecastRows(){
 const allMonths=[...new Set(data.transactions.map(t=>monthKey(t.date)))].sort();
 return Object.values(data.products).map(p=>{const by=monthlySeries(p.barcode), vals=allMonths.map(m=>by[m]||0);let monthly=0;
  if(p.type==='fixed') monthly=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
  else if(p.type==='semi'){const recent=vals.slice(-3);const w=recent.map((_,i)=>i+1),den=w.reduce((a,b)=>a+b,0)||1;monthly=recent.reduce((s,v,i)=>s+v*w[i],0)/den}
  else {const nonzero=vals.filter(v=>v>0);monthly=nonzero.length?nonzero.reduce((a,b)=>a+b,0)/nonzero.length:0}
  return {...p,monthly:Math.ceil(monthly),months:vals.length};
 }).sort((a,b)=>['fixed','semi','variable'].indexOf(a.type)-['fixed','semi','variable'].indexOf(b.type)||a.name.localeCompare(b.name));
}
function renderForecast(){const rows=forecastRows();let total=0;const html=rows.map(p=>{const est=p.monthly*Number(p.lastPrice||0);if(p.type!=='variable')total+=est;return `<div class="card ${p.type}"><b>${esc(p.name)}</b><br><span>${p.type==='variable'?'Optional typical buy':'Suggested'}: ${p.monthly}/month · est. $${est.toFixed(2)} · ${esc(p.type)}</span></div>`}).join('');$('forecast').innerHTML=(html||'<p>Scan purchases to build a forecast.</p>')+(rows.length?`<div class="total"><b>Estimated fixed + semi monthly spend:</b> $${total.toFixed(2)}</div>`:'')}
function renderHistory(){const rows=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date));$('historyList').innerHTML=rows.slice(0,200).map(t=>{const p=data.products[t.barcode]||{name:t.barcode};return `<div class="card"><b>${esc(p.name)}</b><br><span>${new Date(t.date).toLocaleString()} · qty ${t.quantity} · $${Number(t.price||0).toFixed(2)}</span></div>`}).join('')||'<p>No purchases yet.</p>'}
function renderAll(){renderProducts();renderForecast();renderHistory();$('dataPreview').textContent=JSON.stringify(data,null,2)}
$('refreshForecast').onclick=renderForecast;$('printPdf').onclick=()=>window.print();
$('exportJson').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`home-inventory-v2-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('importJson').onchange=async e=>{try{const incoming=JSON.parse(await e.target.files[0].text());if(!incoming.products||!Array.isArray(incoming.transactions))throw new Error();data={version:2,products:incoming.products,transactions:incoming.transactions};Store.save(data);renderAll();alert('Import complete.')}catch{alert('Invalid inventory JSON file.')}};
$('clearData').onclick=()=>{if(confirm('Delete all local V2 inventory data on this device?')){Store.clear();data=Store.load();renderAll()}};
