import { EMPLOYEES } from '../model.js';
export const DEPARTMENTS = [
  {id:'dept-data-lab', team:'Data lab', name:'The discovery lab', subtitle:'Research · extraction · data quality', accent:'#82aaa5', kind:'lab'},
  {id:'dept-intelligence', team:'Intelligence', name:'The intelligence library', subtitle:'Accounts · contacts · hiring signals', accent:'#b2a6cf', kind:'library'},
  {id:'dept-outbound', team:'Outbound', name:'The conversation floor', subtitle:'Five channels, dedicated specialists', accent:'#d6a376', kind:'outbound'},
  {id:'dept-pipeline', team:'Pipeline', name:'The client studio', subtitle:'Discovery · solutions · commercial', accent:'#8faac2', kind:'pipeline'},
  {id:'dept-operations', team:'Operations', name:'The operations suite', subtitle:'Quality · systems · performance', accent:'#a0b68d', kind:'operations'},
  {id:'dept-strategy', team:'Strategy', name:'The strategy atelier', subtitle:'Territory · direction · capacity', accent:'#c9a86a', kind:'strategy'},
  {id:'dept-creative', team:'Creative', name:'The creative atelier', subtitle:'Copy · storytelling · portfolios', accent:'#c59cab', kind:'creative'},
  {id:'dept-retention', team:'Retention', name:'The partnership lounge', subtitle:'Relationships · renewal · growth', accent:'#b5aa8b', kind:'lounge'},
];
export const PLATFORMS = [
  {id:'research', name:'Research', description:'Web evidence & source verification', accent:'#82aaa5', kind:'library'},
  {id:'email', name:'Email', description:'Personalization & deliverability', accent:'#d8ae7b', kind:'outbound'},
  {id:'linkedin', name:'LinkedIn', description:'Professional relationship building', accent:'#8caed5', kind:'outbound'},
  {id:'phone', name:'Calls', description:'Conversation preparation & follow-up', accent:'#b1a2d0', kind:'outbound'},
  {id:'whatsapp', name:'WhatsApp', description:'Approved business conversations', accent:'#8ab59e', kind:'outbound'},
  {id:'forms', name:'Website forms', description:'Official application routes', accent:'#ca9ba3', kind:'pipeline'},
  {id:'crm', name:'CRM & operations', description:'Pipeline, governance & client success', accent:'#b8b08c', kind:'operations'},
  {id:'creative', name:'Creative tools', description:'Copy, portfolio & sales enablement', accent:'#bf9caf', kind:'creative'},
];
export const ROOM_KEYS = [...DEPARTMENTS.map(d=>d.id), ...PLATFORMS.map(p=>'platform-'+p.id)];
export function employeePlatform(employee, config = {}) {
  return config.employees?.[employee.id]?.platform || ({email:'email',deliverability:'email',linkedin:'linkedin',phone:'phone',whatsapp:'whatsapp',forms:'forms',copy:'creative',portfolio:'creative',enablement:'creative',dataresearch:'research',extraction:'research',dataquality:'research',intent:'research',research:'research',enrichment:'research',hiring:'research',qualification:'research'}[employee.role] || 'crm');
}
export function roomInfo(key) {
  return DEPARTMENTS.find(d=>d.id===key) || PLATFORMS.map(p=>({...p,id:'platform-'+p.id,subtitle:p.description})).find(p=>p.id===key) || DEPARTMENTS[0];
}
export function membersFor(key, config) {
  const department=DEPARTMENTS.find(d=>d.id===key);
  return EMPLOYEES.filter(e=>department ? e.team===department.team : employeePlatform(e,config)===key.replace('platform-',''));
}
export function makeRoom(key, count = 16) {
  const info=roomInfo(key), kind=info.kind;
  const objects=[];
  const add=(id,type,x,z,color,rotation=0)=>objects.push({id,type,x,z,color,rotation});
  for(let i=0;i<Math.min(count,16);i++) {
    const x=[-12,-6,0,6][i%4]+(kind==='creative'&&Math.floor(i/4)%2 ? .5:0);
    add('workstation-'+(i+1),'desk',x,-8+Math.floor(i/4)*4.15,kind==='lab'?'#c8d1c6':kind==='creative'?'#cfb5a6':kind==='operations'?'#9caaa8':'#c6af8d');
  }
  add('lounge-1','sofa',-12,10,info.accent); add('coffee-1','table',-8.7,10,'#6a5645');
  for(const [i,x,z] of [[1,-16,-10],[2,16,10],[3,-16,10]])add('plant-'+i,'plant',x,z,'#486b50');
  add('lamp-1','lamp',-5,10,'#c9a86a');
  if(kind==='outbound') {
    for(let i=0;i<3;i++)add('call-pod-'+i,'booth',14,-8+i*5,info.accent);
    add('whiteboard-1','whiteboard',5,-11,'#e4ded0');
  } else if(kind==='library'||kind==='lab') {
    for(let i=0;i<3;i++)add('library-'+i,kind==='lab'?'server':'bookshelf',14,-8+i*4.2,kind==='lab'?'#38484c':'#79614d');
    add('whiteboard-1','whiteboard',5,-11,'#e8e1d3');
  } else if(kind==='creative') {
    add('moodboard-1','whiteboard',13,-8,info.accent);add('moodboard-2','whiteboard',13,-3,'#e1c594');
    add('collab-sofa','sofa',13,3,info.accent);add('art-1','art',14,8,'#bfa16e');
  } else if(kind==='lounge') {
    for(let i=0;i<2;i++){add('partner-sofa-'+i,'sofa',13,-7+i*7,info.accent);add('partner-table-'+i,'table',13,-4.5+i*7,'#6d5649');}
  } else {
    add('table-board','table',13,-4,'#6f6559');add('glass-partition','partition',9.7,-5,'#aaafa7');
    add('whiteboard-1','whiteboard',13,-10,'#dedbcc');
  }
  if(count<=8) {
    add('collaboration-sofa-1','sofa',-1,6,info.accent);
    add('collaboration-sofa-2','sofa',5,6,'#d3c7b6',Math.PI);
    add('collaboration-table','table',2,8.8,'#826a53');
    add('indoor-tree','plant',-5,5,'#4a7052');
    add('reading-light','lamp',8,8,'#c9a86a');
  }
  return {objects,positions:{}};
}
