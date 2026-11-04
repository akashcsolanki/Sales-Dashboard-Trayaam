"""Reproducible, offline import. Real data is written ONLY into ignored .private/."""
import csv,json,pathlib,hashlib,collections,datetime
ROOT=pathlib.Path(__file__).resolve().parents[2]; APP=pathlib.Path(__file__).resolve().parents[1]
OUT=APP/'.private'; OUT.mkdir(exist_ok=True)
def read(p):
 with open(ROOT/p,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
base='outreach/refined-uk-gmb-2026-10-07/'
master=read(base+'agencies_master.csv'); hiring=read('outputs/hiring-expansion-2026-10-08/Trayaam-Hiring-Agencies.csv')
jobs={r['Company ID']:r for r in hiring}; apps={r['company_id']:r for r in read('outputs/all-hiring-agencies-campaign-2026-10-08/Application-Submission-Register.csv')}
contacts=collections.defaultdict(list); locations=collections.defaultdict(list)
for r in read(base+'published_contacts.csv'):contacts[r['company_id']].append(r)
for r in read(base+'locations.csv'):locations[r['company_id']].append(r)
people={r['company_id']:r for r in read(base+'linkedin_decision_maker_enrichment.csv')}
prospects=[]
for r in master:
 cid=r['company_id']; job=jobs.get(cid); application=apps.get(cid); locs=locations[cid]
 coordinates=[]
 for l in locs:
  try:coordinates.append({'lat':float(l['latitude']),'lng':float(l['longitude']),'address':l['gmb_address'],'source':l['google_maps'],'basis':'Source listing coordinates; not independently geocoded'})
  except (ValueError,KeyError):pass
 prospects.append({'id':cid,'name':r['business_name'],'city':r['primary_search_city'],'country':'United Kingdom','industry':r['source_category'] or 'Unclassified','priority':'P1 · Hiring shortlist' if job else r['priority'],'shortlist':bool(job),'website':r['website'],'email':r['business_email'],'phone':r['phone'].lstrip("'"),'linkedin':r['linkedin_company'],'services':r['services_observed'],'offer':r['proposed_offer'],'stage':r['contact_stage'] or 'Not contacted','channel':r['channel'] or 'Unassigned','owner':r['owner'],'nextAction':r['next_action'],'nextDate':r['next_action_date'],'lastContact':r['last_contact_date'],'suppressed':r['do_not_contact'] not in ('','No recorded opt-out','No'),'suppressionReason':r['suppression_reason'],'eligibility':r['eligibility_review'] or 'Needs review','notes':r['team_notes'],'checkedAt':r['checked_at'],'rating':r['rating'],'reviewCount':r['review_count'],'emailStatus':r['email_status'],'emailSource':r['email_source'],'contactPage':r['contact_page'],'fit':r['fit_category'],'technology':r['technology_signals'],'sources':r['source_refs'],'coordinates':coordinates,'contacts':contacts[cid],'decisionMaker':people.get(cid,{}),'job':job,'application':application,'version':0,'value':0,'hiringVerification':{'status':'Needs recheck','checkedAt':None,'roles':[]},'original':r})
assert len(prospects)==len({p['id'] for p in prospects})
assert all(cid in {p['id'] for p in prospects} for cid in jobs)
inventory=[]
for folder in ['outreach','outputs']:
 for p in sorted((ROOT/folder).rglob('*.csv')):
  with open(p,encoding='utf-8-sig',newline='') as f:
   rows=list(csv.reader(f))
  inventory.append({'path':p.relative_to(ROOT).as_posix(),'rows':max(0,len(rows)-1),'columns':rows[0] if rows else [],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'classification':'Unreviewed starter / historical evidence' if 'additional-b2b' in str(p) else 'Canonical or supporting evidence'})
snapshot={'prospects':prospects,'inventory':inventory,'importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'shortlistCount':len(jobs),'roleEvidence':read('outputs/hiring-expansion-2026-10-08/Role-Evidence.csv'),'roleDemand':read('outputs/hiring-expansion-2026-10-08/Role-Demand.csv'),'reviewQueue':read(base+'review_queue.csv'),'duplicateAliases':read(base+'duplicate_aliases.csv'),'coverage':read('outputs/hiring-expansion-2026-10-08/All-Agency-Coverage.csv'),'applicationResults':(ROOT/'outputs/all-hiring-agencies-campaign-2026-10-08/APPLICATION_RESULTS.md').read_text(encoding='utf-8')}
(OUT/'snapshot.json').write_text(json.dumps(snapshot,ensure_ascii=False),encoding='utf-8')
def sql(v):return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'"
lines=['CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);','CREATE TABLE IF NOT EXISTS metadata(id TEXT PRIMARY KEY,data TEXT NOT NULL);','CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,data TEXT NOT NULL);','CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);','CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);','CREATE TABLE IF NOT EXISTS login_attempts(id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset INTEGER NOT NULL);']
for p in prospects:lines.append(f"INSERT INTO records(id,data) VALUES('{p['id']}',{sql(p)}) ON CONFLICT(id) DO NOTHING;")
for k,v in snapshot.items():
 if k=='prospects':continue
 if isinstance(v,list):
  for i,item in enumerate(v):lines.append(f"INSERT INTO metadata VALUES('{k}::{i:06}',{sql(item)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data;")
 else:lines.append(f"INSERT INTO metadata VALUES('{k}',{sql(v)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data;")
(OUT/'seed.sql').write_text('\n'.join(lines),encoding='utf-8')
source_lines=['CREATE TABLE IF NOT EXISTS source_rows(source TEXT NOT NULL, row_number INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(source,row_number));']
for item in inventory:
 if 'additional-b2b' not in item['path']:continue
 with open(ROOT/item['path'],encoding='utf-8-sig',newline='') as f: raw=list(csv.reader(f))
 for i,row in enumerate(raw[1:],1):
  if not any(v.strip() for v in row):continue
  source=item['path'].replace("'","''")
  source_lines.append(f"INSERT INTO source_rows VALUES('{source}',{i},{sql(row)}) ON CONFLICT(source,row_number) DO NOTHING;")
(OUT/'starter-sources.sql').write_text('\n'.join(source_lines),encoding='utf-8')
print(json.dumps({'companies':len(prospects),'priorityShortlist':len(jobs),'sourceCSVs':len(inventory),'locations':sum(len(p['coordinates']) for p in prospects),'privateOutput':str(OUT)}))
