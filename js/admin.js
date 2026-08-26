/* js/admin.js — FINAL complete admin panel */
(function () {
  function fail(m){var el=document.getElementById('adminError');if(el){el.style.display='block';el.textContent=m;}console.error('[ADMIN]',m);}
  window.addEventListener('error',function(e){fail('JS Error: '+e.message);});
  if(typeof APP_CONFIG==='undefined'){fail('config.js not loaded');return;}
  if(typeof API==='undefined'){fail('api.js not loaded');return;}

  var S=(typeof getSession==='function')?getSession():null;
  var urlS=new URLSearchParams(location.search).get('session');
  if((!S||S.role!=='admin')&&urlS){try{S=JSON.parse(decodeURIComponent(urlS));setSession(S);history.replaceState(null,'',location.pathname);}catch(e){}}
  if(!S||S.role!=='admin'){location.href='/admin/';return;}

  var esc=window.escapeHtml||function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  function jsStr(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"');}
  function fld(k,l,v){return '<label>'+l+'<input type="text" name="'+k+'" value="'+esc(v||'')+'"></label>';}
  function sel(k,l,v,opts){return '<label>'+l+'<select name="'+k+'">'+opts.map(function(o){return '<option '+(String(v)===o?'selected':'')+'>'+o+'</option>';}).join('')+'</select></label>';}
  function findBooking(id){for(var i=0;i<lastData.length;i++){if(lastData[i].booking_id===id)return lastData[i];}return null;}
  var notify=window.showToast||function(m){alert(m);};
  var $=function(id){return document.getElementById(id);};
  var content=$('adminContent'),title=$('adminTitle'),addBtn=$('adminAddBtn'),sidebar=$('adminSidebar'),modal=$('adminModal'),modalBody=$('adminModalBody');
  $('adminMenuBtn').onclick=function(){sidebar.classList.toggle('open');};
  $('adminLogout').onclick=function(e){
  e.preventDefault();
  API.request('logout',{});
  clearSession();
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'BUST' });
  }
  try { localStorage.clear(); } catch(e){}
  window.location.href='/admin/';
};
  modal.addEventListener('click',function(e){if(e.target===modal)modal.classList.remove('open');});
  function api(a,d){return API.request(a,Object.assign({},d||{},{_token:S.token}));}
  function toast(r){notify(r&&r.success?'Saved successfully':(r&&r.message)||'Failed',r&&r.success?'success':'error');}

  var CFG={
    dashboard:{title:'Dashboard'},
    bookings:{title:'Bookings',sheet:'Bookings'},
    customers:{title:'Customers',sheet:'Users',cols:['name','mobile','email','status']},
    tests:{title:'Tests',sheet:'Tests',id:'test_id',cols:['name','price','discount_price','status'],fields:[
      ['name','Test Name','text',1],['test_code','Test Code','text'],['slug','Slug (URL)','text',1],
      ['category_id','Category ID','text'],['description','Description','textarea'],
      ['sample_type','Sample Type','select',['Blood','Urine','Stool','Saliva','Other']],
      ['fasting_required','Fasting Required','check'],['preparation','Preparation','text'],
      ['report_time','Report Time','text'],['price','Price (₹)','number'],['discount_price','Discount Price (₹)','number'],
      ['home_collection','Home Collection','check'],['collection_fee','Collection Fee (₹)','number'],
      ['badge','Badge','text'],['sort_order','Sort Order','number'],['status','Status','select',['ACTIVE','INACTIVE']]]},
    packages:{title:'Packages',sheet:'Packages',id:'package_id',cols:['name','original_price','offer_price','status'],fields:[
      ['name','Package Name','text',1],['slug','Slug (URL)','text',1],['category_id','Category ID','text'],
      ['description','Description','textarea'],['test_ids','Included Tests','testcheck'],
      ['original_price','Original Price (₹)','number'],['offer_price','Offer Price (₹)','number'],['discount','Discount (₹)','number'],
      ['preparation','Preparation','text'],['report_time','Report Time','text'],['featured','Featured','check'],
      ['sort_order','Sort Order','number'],['status','Status','select',['ACTIVE','INACTIVE']]]},
    categories:{title:'Categories',sheet:'Categories',id:'category_id',cols:['name','slug','status'],fields:[
      ['name','Name','text',1],['slug','Slug','text',1],['icon','Icon (fa-...)','text'],['description','Description','textarea'],['status','Status','select',['ACTIVE','INACTIVE']]]},
    prescriptions:{title:'Prescriptions',sheet:'Prescriptions',cols:['file_name','status','uploaded_at']},
    collectors:{title:'Collectors',sheet:'SampleAgents',id:'agent_id',cols:['name','mobile','email','area','status'],fields:[
      ['name','Full Name','text',1],['mobile','Mobile Number','text',1],['email','Email','text'],
      ['password','Password','text',1],['area','Service Area','text'],['status','Status','select',['ACTIVE','INACTIVE']]]},
    samples:{title:'Samples',sheet:'Samples',cols:['sample_id','booking_id','status','collection_time']},
    technicians:{title:'Technicians',sheet:'Technicians',id:'tech_id',cols:['name','email','status'],fields:[
      ['name','Name','text',1],['email','Email','text',1],['password','Password','text'],['specialization','Specialization','text'],['status','Status','select',['ACTIVE','INACTIVE']]]},
    reports:{title:'Reports',sheet:'Reports',cols:['report_id','patient_name','status']},
    articles:{title:'Articles',sheet:'HealthArticles',id:'article_id',cols:['title','tag','status'],fields:[
      ['title','Title','text',1],['slug','Slug (URL)','text',1],['tag','Tag','text'],['excerpt','Excerpt','textarea'],['content','Content','textarea'],['status','Status','select',['PUBLISHED','DRAFT']]]},
    faqs:{title:'FAQs',sheet:'FAQs',id:'faq_id',cols:['question','status'],fields:[
      ['question','Question','textarea',1],['answer','Answer','textarea',1],['status','Status','select',['ACTIVE','INACTIVE']]]}
  };

  var current='dashboard',lastData=[],currentPage=1,perPage=20,filterDateFrom='',filterDateTo='',searchQuery='';
  function btn(l,oc,c){return '<button class="btn '+(c||'btn-secondary')+'" onclick="'+oc+'">'+l+'</button>';}
  function fmtDate(v){if(!v)return '—';var d=new Date(v);if(isNaN(d))return String(v).slice(0,10);return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
  function fmtTime(v){if(!v)return '—';var d=new Date(v);if(isNaN(d))return '—';return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});}

  function bookingsTable(data){
    data.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
    var filtered=data;
    if(searchQuery){var q=searchQuery.toLowerCase();filtered=filtered.filter(function(b){return (b.booking_id||'').toLowerCase().includes(q)||(b.patient_name||'').toLowerCase().includes(q)||(b.patient_mobile||'').toLowerCase().includes(q);});}
    if(filterDateFrom||filterDateTo){filtered=filtered.filter(function(b){var c=b.collection_date?new Date(b.collection_date):null;if(!c)return false;if(filterDateFrom&&c<new Date(filterDateFrom))return false;if(filterDateTo&&c>new Date(filterDateTo))return false;return true;});}
    var totalPages=Math.ceil(filtered.length/perPage);
    var pageData=filtered.slice((currentPage-1)*perPage,(currentPage-1)*perPage+perPage);
    lastData=data;

    var filterHtml='<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">'+
      '<input type="text" id="searchInput" placeholder="Search Booking ID / Name / Mobile" value="'+esc(searchQuery)+'" style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid var(--border);border-radius:6px;">'+
      '<input type="date" id="filterDateFrom" value="'+filterDateFrom+'" style="padding:8px;border:1.5px solid var(--border);border-radius:6px;">'+
      '<input type="date" id="filterDateTo" value="'+filterDateTo+'" style="padding:8px;border:1.5px solid var(--border);border-radius:6px;">'+
      '<button class="btn btn-primary" onclick="A.applyFilters()">Filter</button>'+
      '<button class="btn btn-secondary" onclick="A.clearFilters()">Clear</button>'+
      '<button class="btn btn-secondary" onclick="A.refreshBookings()" title="Reload from server"><i class="fa-solid fa-rotate"></i> Refresh</button></div>';

    var rows=pageData.map(function(b){
      var st=String(b.status||'PENDING').toLowerCase();
      var items=b.items||[];
      var tc=items.filter(function(i){return i.item_type==='test';}).length;
      var pc=items.filter(function(i){return i.item_type==='package';}).length;
      var il='';
      if(tc)il+='<i class="fa-solid fa-flask-vial"></i> '+tc+' test'+(tc>1?'s':'');
      if(tc&&pc)il+=' · ';
      if(pc)il+='<i class="fa-solid fa-box-open"></i> '+pc+' package'+(pc>1?'s':'');
      if(!tc&&!pc)il='<span style="color:#94a3b8">—</span>';
      return '<tr>'+
        '<td data-th="Booking ID"><span class="bk-id">'+esc(b.booking_id)+'</span><span class="bk-status '+st+'">'+esc(b.status||'Pending')+'</span></td>'+
        '<td data-th="Patient"><div class="pt-cell"><span class="pt-name">'+esc(b.patient_name||'—')+' <span class="pt-tag">'+esc(b.patient_gender||'')+(b.patient_age?', '+esc(b.patient_age):'')+'</span></span>'+
        '<span class="pt-sub"><i class="fa-solid fa-phone"></i>'+esc(b.patient_mobile||'Not provided')+'</span>'+
        '<span class="pt-sub"><i class="fa-solid fa-envelope"></i>'+esc(b.patient_email||'Not provided')+'</span>'+
        '<span class="pt-sub"><i class="fa-solid fa-location-dot"></i>'+esc(b.address||'Not provided')+'</span></div></td>'+
        '<td data-th="Items"><div class="bk-items-summary">'+il+'</div></td>'+
        '<td data-th="Collection"><span class="method-pill"><i class="fa-solid '+((b.collection_method||'').toUpperCase()==='HOME'?'fa-house':'fa-store')+'"></i>'+esc(b.collection_method||'—')+'</span></td>'+
        '<td data-th="Date" class="dt-cell">'+fmtDate(b.collection_date)+'</td>'+
        '<td data-th="Time" class="tm-cell">'+esc(b.collection_time||'—')+'</td>'+
        '<td data-th="Booked On" class="booked-on-cell"><i class="fa-regular fa-clock"></i> '+fmtDate(b.created_at)+'<br><small>'+fmtTime(b.created_at)+'</small></td>'+
        '<td data-th="Action" class="td-actions"><button class="btn btn-primary" onclick="A.details(\''+jsStr(b.booking_id)+'\')"><i class="fa-solid fa-eye"></i> Show Details</button></td></tr>';
    }).join('');

    var pag='';
    if(totalPages>1){pag='<div style="display:flex;gap:6px;justify-content:center;margin-top:16px;">';for(var i=1;i<=totalPages;i++){pag+='<button class="btn '+(i===currentPage?'btn-primary':'btn-secondary')+'" onclick="A.goToPage('+i+')">'+i+'</button>';}pag+='</div>';}

    content.innerHTML=filterHtml+'<div class="admin-table-wrap"><table class="admin-table bookings-table"><thead><tr><th>Booking ID</th><th>Patient Details</th><th>Items</th><th>Collection</th><th>Date</th><th>Time</th><th>Booked On</th><th style="text-align:right">Action</th></tr></thead><tbody>'+(rows||'<tr><td colspan="8">No records yet</td></tr>')+'</tbody></table></div>'+pag;
        setTimeout(function(){
      var si=document.getElementById('searchInput');
      if(si){
        si.addEventListener('keypress',function(e){if(e.key==='Enter')A.applyFilters();});
        var t=null;
        si.addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){searchQuery=si.value;currentPage=1;bookingsTable(lastData);},250);});
      }
    },100);
  }

  function bookingDetails(id){
    var b=findBooking(id);
    if(!b){notify('Booking not found','error');return;}
    var st=String(b.status||'PENDING').toLowerCase();
    var itemsSummary=b.items_summary||'';
    var isSelf=(String(b.is_self)==='TRUE'||b.is_self===true);
    var doctor=b.doctor_name||'';

    modalBody.innerHTML=
      '<div class="bk-modal-head"><div><h3>'+esc(b.patient_name||'Booking Details')+'</h3>'+
      '<span class="bk-id">'+esc(b.booking_id)+'</span> <span class="bk-status '+st+'">'+esc(b.status||'Pending')+'</span></div>'+
      '<button class="modal-close" onclick="A.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>'+
      (itemsSummary?'<div class="bk-sec" style="background:linear-gradient(135deg,var(--primary-50),#f0f9ff);border-color:var(--primary);"><h4><i class="fa-solid fa-flask-vial"></i> Items</h4><div style="font-size:14px;line-height:1.8;padding:10px 0;">'+esc(itemsSummary)+'</div></div>':'')+
      '<div class="bk-sec"><h4><i class="fa-solid fa-user"></i> Patient Information</h4><div class="bk-grid">'+
        '<div><span class="k">Name</span><span class="v">'+esc(b.patient_name||'—')+'</span></div>'+
        '<div><span class="k">Gender / Age</span><span class="v">'+esc(b.patient_gender||'—')+(b.patient_age?', '+esc(b.patient_age):'')+'</span></div>'+
        '<div><span class="k">Mobile</span><span class="v"><a href="tel:'+esc(b.patient_mobile||'')+'" style="color:var(--primary);">'+esc(b.patient_mobile||'—')+'</a></span></div>'+
        '<div><span class="k">Email</span><span class="v"><a href="mailto:'+esc(b.patient_email||'')+'" style="color:var(--primary);">'+esc(b.patient_email||'—')+'</a></span></div>'+
        '<div class="full"><span class="k">Address</span><span class="v">'+esc(b.address||'—')+'</span></div></div></div>'+
      '<div class="bk-sec"><h4><i class="fa-solid fa-user-doctor"></i> Reference (Doctor / Self)</h4><div class="bk-grid">'+
        '<div class="full"><span class="k">Referred By</span><span class="v">'+(isSelf?'<i class="fa-solid fa-user"></i> Self':(doctor?'<i class="fa-solid fa-user-doctor"></i> Dr. '+esc(doctor):'— Not set —'))+'</span></div></div></div>'+
      '<div class="bk-sec"><h4><i class="fa-solid fa-indian-rupee-sign"></i> Payment Summary</h4><div class="bk-grid">'+
        '<div><span class="k">Subtotal</span><span class="v">₹'+esc(b.subtotal!=null?Number(b.subtotal).toLocaleString('en-IN'):'0')+'</span></div>'+
        '<div><span class="k">Discount</span><span class="v">₹'+esc(b.discount||0)+'</span></div>'+
        '<div><span class="k">Collection Fee</span><span class="v">₹'+esc(b.collection_fee||0)+'</span></div>'+
        '<div class="full" style="border-top:2px solid var(--primary);padding-top:10px;margin-top:6px;"><span class="k">Total Paid</span><span class="v" style="color:var(--primary);font-size:18px;font-weight:800;">₹'+esc(b.total!=null?Number(b.total).toLocaleString('en-IN'):'0')+'</span></div></div></div>'+
      '<div class="bk-sec"><h4><i class="fa-solid fa-vial"></i> Collection Details</h4><div class="bk-grid">'+
        '<div class="full highlight-time"><span class="k">Booked On</span><span class="v" style="color:var(--primary);font-size:14px;">'+fmtDate(b.created_at)+' at '+fmtTime(b.created_at)+'</span></div>'+
        '<div><span class="k">Method</span><span class="v"><i class="fa-solid '+(b.collection_method==='HOME'?'fa-house':'fa-store')+'" style="margin-right:6px;"></i>'+esc(b.collection_method||'—')+'</span></div>'+
        '<div><span class="k">Collection Date</span><span class="v">'+fmtDate(b.collection_date)+'</span></div>'+
        '<div class="full"><span class="k">Time Slot</span><span class="v">'+esc(b.collection_time||'—')+'</span></div></div></div>'+
      '<div class="bk-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
        '<button class="btn btn-primary" onclick="A.assign(\''+jsStr(b.booking_id)+'\')"><i class="fa-solid fa-person"></i> Assign Collector</button>'+
        '<select id="statusDropdown" onchange="A.changeStatus(\''+jsStr(b.booking_id)+'\',this.value)" style="padding:10px;border:1.5px solid var(--border);border-radius:6px;font-size:14px;">'+
          '<option value="">Change Status...</option><option value="CONFIRMED">Confirm (Send Email)</option><option value="COMPLETED">Mark Completed</option><option value="CANCELLED">Cancel (Ask Reason)</option></select></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">'+
        '<button class="btn btn-secondary" onclick="A.editBooking(\''+jsStr(b.booking_id)+'\')"><i class="fa-solid fa-pen"></i> Edit Details</button>'+
        '<button class="btn btn-secondary" onclick="A.uploadReport(\''+jsStr(b.booking_id)+'\',\''+jsStr(b.patient_name||'')+'\',\''+jsStr(b.patient_mobile||'')+'\',\''+jsStr(b.patient_email||'')+'\')"><i class="fa-solid fa-file-pdf"></i> Upload Report</button></div>';
    modal.classList.add('open');
  }

  function stat(n,l){return '<div class="stat-card"><div class="num">'+(n||0)+'</div><div class="lbl">'+l+'</div></div>';}
  function renderDashboard(){
    addBtn.style.display='none';
    api('adminDashboard').then(function(r){var d=(r&&r.data)||{};
      content.innerHTML='<div class="stat-grid">'+stat(d.today,"Today's Bookings")+stat(d.pending,'Pending')+stat(d.assigned,'Assigned')+stat(d.collected,'Collected')+stat(d.processing,'Processing')+stat(d.reportsPending,'Reports Pending')+stat(d.reportsReady,'Reports Ready')+stat(d.customers,'Customers')+'</div>';});
  }

  function fieldHtml(f,val){
    var k=f[0],label=f[1],type=f[2]||'text',opts=f[3];
    var v=(val!==undefined&&val!==null)?val:'';
    if(type==='textarea')return '<label>'+label+'<textarea name="'+k+'" rows="2">'+esc(v)+'</textarea></label>';
    if(type==='check'){var c=(v===true||v==='TRUE'||v==='true')?'checked':'';return '<label class="chk"><input type="checkbox" name="'+k+'" '+c+'> '+label+'</label>';}
    if(type==='select'){return '<label>'+label+'<select name="'+k+'">'+(opts||[]).map(function(o){return '<option value="'+o+'" '+(String(v)===o?'selected':'')+'>'+o+'</option>';}).join('')+'</select></label>';}
    if(type==='testcheck')return '<div class="testcheck-wrap"><label>'+label+' (click to include)</label><div id="testcheckBoxes" class="testcheck-grid">Loading tests…</div><input type="hidden" name="'+k+'" id="testIdsHidden" value="'+esc(v)+'"></div>';
    return '<label>'+label+'<input type="'+(type==='number'?'number':'text')+'" name="'+k+'" value="'+esc(v)+'"></label>';
  }

  function openModal(sec,obj){
    var cfg=CFG[sec];
    modalBody.innerHTML='<h3>'+(obj[cfg.id]?'Edit':'Add')+' '+cfg.title+'</h3><form id="crudForm">'+
      '<input type="hidden" name="__id" value="'+esc(obj[cfg.id]||'')+'">'+
      cfg.fields.map(function(f){return fieldHtml(f,obj[f[0]]);}).join('')+
      '<div style="display:flex;gap:10px;"><button class="btn btn-primary" style="flex:1;" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>'+
      '<button class="btn btn-secondary" style="flex:1;" type="button" id="crudCancel"><i class="fa-solid fa-xmark"></i> Cancel</button></div></form>';
    modal.classList.add('open');
    $('crudCancel').onclick=function(){modal.classList.remove('open');};
    if(cfg.fields.some(function(f){return f[2]==='testcheck';})){
      var currentIds=String(obj.test_ids||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
      API.getTests().then(function(r){
        var box=document.getElementById('testcheckBoxes');if(!box)return;
        var tests=(r&&r.data)||[];
        if(!tests.length){box.innerHTML='<em>No tests found</em>';return;}
        box.innerHTML=tests.map(function(t){return '<label class="tc-item"><input type="checkbox" class="tc-box" data-id="'+esc(t.test_id)+'" '+(currentIds.indexOf(t.test_id)>-1?'checked':'')+'> '+esc(t.name)+'</label>';}).join('');
        box.addEventListener('change',function(){
          var ids=Array.from(box.querySelectorAll('.tc-box:checked')).map(function(b){return b.getAttribute('data-id');});
          var hid=document.getElementById('testIdsHidden');if(hid)hid.value=ids.join(',');
        });
      });
    }
    $('crudForm').onsubmit=function(e){
      e.preventDefault();
      var o={};
      var idEl=e.target.elements['__id'];
      var idVal=(idEl&&idEl.value)?idEl.value:(obj&&obj[cfg.id])||'';
      if(idVal)o[cfg.id]=idVal;
      cfg.fields.forEach(function(f){
        var k=f[0],t=f[2]||'text',el=e.target.elements[k];if(!el)return;
        if(t==='check')o[k]=el.checked?'TRUE':'FALSE';
        else if(t==='number')o[k]=el.value===''?'':Number(el.value);
        else if(t==='testcheck'){var hid=document.getElementById('testIdsHidden');o[k]=hid?hid.value:(el.value||'');}
        else o[k]=el.value;
      });
      if(cfg.sheet==='Packages')o.discount=Math.max(0,(Number(o.original_price)||0)-(Number(o.offer_price)||0));
      if(!o[cfg.id])o[cfg.id]=(cfg.sheet==='Tests'?'t_':cfg.sheet==='Packages'?'pkg_':'')+Date.now().toString(36);
      api('adminSave',{sheet:cfg.sheet,idField:cfg.id,obj:o}).then(function(r){modal.classList.remove('open');toast(r);route(current);});
    };
  }

  window.A={
    changeStatus:function(id,st){
      if(!st)return;
      if(st==='CANCELLED'){
        var reason=prompt('Reason for cancellation:');
        if(!reason)return;
        api('adminCancelBooking',{booking_id:id,reason:reason}).then(function(r){modal.classList.remove('open');toast(r);route(current);});
      }else{
        api('adminSetBookingStatus',{booking_id:id,status:st}).then(function(r){modal.classList.remove('open');toast(r);route(current);});
      }
    },
    assign:function(id){
      api('adminGetCollectors').then(function(r){
        if(!r||!r.success){notify((r&&r.message)||'Failed to load collectors','error');return;}
        var booking=findBooking(id);
        var collectors=r.data||[];
        if(!collectors.length){notify('No active collectors found. Add one in Collectors section first.','error');return;}
        var options=collectors.map(function(c){return '<option value="'+esc(c.agent_id)+'">'+esc(c.name)+' ('+esc(c.mobile)+') - '+esc(c.area||'No area')+'</option>';}).join('');
        modalBody.innerHTML=
          '<div class="bk-modal-head"><div><h3><i class="fa-solid fa-person-circle-check"></i> Assign Collector</h3><span class="bk-id">Booking: '+esc(id)+'</span></div>'+
          '<button class="modal-close" onclick="A.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>'+
          '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Select Collector</label>'+
          '<select id="assignCollectorSelect" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:6px;font-size:14px;"><option value="">-- Choose Collector --</option>'+options+'</select></div>'+
          '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Collection Date</label>'+
          '<input type="date" id="assignDate" value="'+(booking&&booking.collection_date?String(booking.collection_date).slice(0,10):'')+'" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:6px;"></div>'+
          '<div style="margin-bottom:14px;"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Collection Time</label>'+
          '<input type="text" id="assignTime" value="'+esc(booking&&booking.collection_time?booking.collection_time:'09:00 - 11:00')+'" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:6px;"></div>'+
          (booking?'<div style="background:var(--surface-2);padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;"><b>Patient:</b> '+esc(booking.patient_name||'—')+'<br><b>Mobile:</b> '+esc(booking.patient_mobile||'—')+'<br><b>Address:</b> '+esc(booking.address||'—')+'</div>':'')+
          '<button class="btn btn-primary btn-block" style="width:100%;padding:12px;font-size:14px;font-weight:700;" onclick="A.doAssign(\''+jsStr(id)+'\')"><i class="fa-solid fa-check"></i> Assign Collector</button>';
        modal.classList.add('open');
      });
    },
    doAssign:function(bookingId){
      var agentId=document.getElementById('assignCollectorSelect').value;
      var date=document.getElementById('assignDate').value;
      var time=document.getElementById('assignTime').value;
      if(!agentId){notify('Please select a collector','error');return;}
      if(!date){notify('Please select a date','error');return;}
      if(!time){notify('Please enter a time','error');return;}
      api('adminAssignCollector',{booking_id:bookingId,agent_id:agentId,assigned_date:date,assigned_time:time}).then(function(r){modal.classList.remove('open');toast(r);route(current);});
    },
    editBooking:function(id){
      var b=findBooking(id);if(!b)return;
      modalBody.innerHTML='<h3>Edit Booking '+esc(id)+'</h3><form id="editBkForm" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
        fld('patient_name','Patient Name',b.patient_name)+
        fld('patient_mobile','Mobile',b.patient_mobile)+
        fld('patient_age','Age',b.patient_age)+
        sel('patient_gender','Gender',b.patient_gender,['Male','Female','Other'])+
        '<label style="grid-column:1/-1;">Email<input type="email" name="patient_email" value="'+esc(b.patient_email||'')+'"></label>'+
        '<label style="grid-column:1/-1;">Address<textarea name="address" rows="2">'+esc(b.address||'')+'</textarea></label>'+
        '<label>Collection Date<input type="date" name="collection_date" value="'+esc(String(b.collection_date||'').slice(0,10))+'"></label>'+
        '<label>Time Slot<input type="text" name="collection_time" value="'+esc(b.collection_time||'')+'"></label>'+
        sel('collection_method','Method',b.collection_method,['HOME','CENTER'])+
        sel('status','Status',b.status,['PENDING','CONFIRMED','ASSIGNED','SAMPLE_COLLECTED','COMPLETED','CANCELLED'])+
        fld('doctor_name','Doctor Name',b.doctor_name)+
        '<label style="align-self:end;" class="chk"><input type="checkbox" name="is_self" '+(String(b.is_self)==='TRUE'?'checked':'')+'> Self (no doctor)</label>'+
        '<div style="grid-column:1/-1;display:flex;gap:10px;"><button class="btn btn-primary" style="flex:1;" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>'+
        '<button class="btn btn-secondary" style="flex:1;" type="button" onclick="A.details(\''+jsStr(id)+'\')">Back</button></div></form>';
      $('editBkForm').onsubmit=function(e){
        e.preventDefault();
        var o={};
        ['patient_name','patient_mobile','patient_age','patient_gender','patient_email','address','collection_date','collection_time','collection_method','status','doctor_name'].forEach(function(k){o[k]=e.target.elements[k].value;});
        o.is_self=e.target.elements.is_self.checked?'TRUE':'FALSE';
        api('adminUpdateBooking',{booking_id:id,obj:o}).then(function(r){toast(r);A.details(id);});
      };
    },
    uploadReport:function(bookingId,patientName,patientMobile,patientEmail){
      modalBody.innerHTML='<h3>Upload Report — '+esc(bookingId)+'</h3>'+
        '<p style="color:var(--muted);margin-bottom:12px;">Patient: '+esc(patientName)+' | '+esc(patientMobile)+'</p>'+
        '<div id="reportList"><p>Loading reports…</p></div>'+
        '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;">'+
          '<input type="file" id="reportFile" accept="application/pdf" multiple>'+
          '<button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="A.doUploadReport(\''+jsStr(bookingId)+'\',\''+jsStr(patientName)+'\',\''+jsStr(patientMobile)+'\')"><i class="fa-solid fa-upload"></i> Upload PDF</button></div>'+
        '<button class="btn btn-secondary btn-block" style="margin-top:12px;" onclick="A.closeModal()">Close</button>';
      A.loadReports(bookingId,patientName,patientMobile);
    },
    loadReports:function(bookingId,patientName,patientMobile){
      api('adminGetBookingReports',{booking_id:bookingId}).then(function(r){
        var box=document.getElementById('reportList');if(!box)return;
        if(!r||!r.success||!r.data||!r.data.length){box.innerHTML='<p style="color:var(--muted);">No reports uploaded yet.</p>';return;}
        box.innerHTML=r.data.map(function(rep){
          var wa='https://wa.me/91'+String(patientMobile).replace(/\D/g,'')+'?text='+encodeURIComponent('Hi '+patientName+', your test report for booking '+bookingId+' is ready. Download: '+rep.download_url);
          return '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">'+
            '<span style="flex:1;min-width:120px;font-size:13px;"><i class="fa-solid fa-file-pdf" style="color:var(--primary);"></i> '+esc(rep.file_name)+'</span>'+
            '<a class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" href="'+rep.url+'" target="_blank"><i class="fa-solid fa-eye"></i> View</a>'+
            '<a class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" href="'+rep.download_url+'" target="_blank"><i class="fa-solid fa-download"></i> Download</a>'+
            '<a class="btn btn-primary" style="padding:5px 10px;font-size:11px;" href="'+wa+'" target="_blank"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>'+
            '<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="A.sendReportEmail(\''+jsStr(rep.report_id)+'\')"><i class="fa-solid fa-envelope"></i> Email</button></div>';
        }).join('');
      });
    },
    doUploadReport:function(bookingId,patientName,patientMobile){
      var input=document.getElementById('reportFile');
      if(!input||!input.files.length){notify('Select a PDF first','error');return;}
      var files=Array.from(input.files),done=0;
      files.forEach(function(file){
        var reader=new FileReader();
        reader.onload=function(e){
          var base64=e.target.result.split(',')[1];
          api('adminUploadReport',{booking_id:bookingId,patient_name:patientName,file_data:base64,file_name:file.name}).then(function(r){
            done++;
            if(done===files.length){notify('Report uploaded','success');A.loadReports(bookingId,patientName,patientMobile);}
          });
        };
        reader.readAsDataURL(file);
      });
    },
    sendReportEmail:function(reportId){api('adminSendReportEmail',{report_id:reportId}).then(function(r){toast(r);});},
    viewRx:function(id){api('adminPrescriptionUrl',{id:id}).then(function(r){if(r&&r.url)window.open(r.url,'_blank');else notify('Cannot open','error');});},
    approve:function(id){api('adminApproveReport',{report_id:id}).then(function(r){toast(r);route(current);});},
    edit:function(sec,i){openModal(sec,lastData[i]||{});},
    del:function(sec,i){var cfg=CFG[sec];var id=(lastData[i]||{})[cfg.id];if(!id||!confirm('Delete this record?'))return;api('adminDelete',{sheet:cfg.sheet,idField:cfg.id,id:id}).then(function(r){toast(r);route(current);});},
    details:bookingDetails,
    closeModal:function(){modal.classList.remove('open');},
    applyFilters:function(){searchQuery=document.getElementById('searchInput').value;filterDateFrom=document.getElementById('filterDateFrom').value;filterDateTo=document.getElementById('filterDateTo').value;currentPage=1;bookingsTable(lastData);},
    clearFilters:function(){searchQuery='';filterDateFrom='';filterDateTo='';currentPage=1;bookingsTable(lastData);},
    goToPage:function(p){currentPage=p;bookingsTable(lastData);},
    refreshBookings:function(){route('bookings');},
  };

  function route(sec){
    current=sec||'dashboard';
    var cfg=CFG[current]||CFG.dashboard;
    title.textContent=cfg.title;
    sidebar.querySelectorAll('a').forEach(function(a){a.classList.toggle('active',a.getAttribute('data-sec')===current);});
    sidebar.classList.remove('open');
    addBtn.style.display='none';
    if(current==='dashboard'){renderDashboard();return;}
    if(cfg.fields&&current!=='bookings'){addBtn.style.display='inline-flex';addBtn.onclick=function(){openModal(current,{});};}
    content.innerHTML='<p style="padding:20px;color:#64748b;">Loading...</p>';
    var apiName=(current==='bookings')?'adminBookingsWithItems':'adminList';
    var apiData=(current==='bookings')?{}:{sheet:cfg.sheet};
    api(apiName,apiData).then(function(r){
      if(!r||!r.success){
        if(r&&r.message==='Unauthorized')content.innerHTML='<div style="padding:30px;text-align:center;"><i class="fa-solid fa-lock" style="font-size:34px;color:#b91c1c;"></i><p style="margin:12px 0;color:#b91c1c;">Session expired.</p><a class="btn btn-primary" href="/admin/">Login again</a></div>';
        else content.innerHTML='<p style="padding:20px;color:#b91c1c;">'+esc((r&&r.message)||'Failed to load')+'</p>';
        return;
      }
      if(current==='bookings')bookingsTable(r.data);
      else table(cfg.cols,r.data,current);
    });
  }

  function table(cols,data,sec){
    lastData=data||[];
    var rows=lastData.map(function(row,i){return '<tr>'+cols.map(function(c){return '<td data-th="'+c+'">'+esc(row[c]!==undefined?row[c]:'')+'</td>';}).join('')+'<td data-th="Actions" class="td-actions">'+rowActions(sec,row,i)+'</td></tr>';}).join('');
    content.innerHTML='<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'<th>Actions</th></tr></thead><tbody>'+(rows||'<tr><td colspan="99">No records yet</td></tr>')+'</tbody></table></div>';
  }

  function rowActions(sec,row,i){
    var cfg=CFG[sec],h='';
    if(sec==='prescriptions')h+=btn('View',"A.viewRx('"+row.prescription_id+"')",'btn-primary');
    else if(sec==='reports'&&row.status==='SUBMITTED')h+=btn('Approve & Publish',"A.approve('"+row.report_id+"')",'btn-primary');
    if(cfg&&cfg.id)h+=btn('Edit',"A.edit('"+sec+"',"+i+")")+btn('Del',"A.del('"+sec+"',"+i+")");
    return h;
  }

  window.addEventListener('hashchange',function(){route(location.hash.replace('#',''));});
  route(location.hash.replace('#','')||'dashboard');
})();