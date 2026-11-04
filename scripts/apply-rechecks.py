import json,pathlib
APP=pathlib.Path(__file__).resolve().parents[1]; private=APP/'.private'
snapshot=json.loads((private/'snapshot.json').read_text(encoding='utf-8'));checks=json.loads((private/'hiring-rechecks.json').read_text(encoding='utf-8'));byid={r['id']:r for r in checks}
sql=[]
for p in snapshot['prospects']:
 if p['id'] not in byid:continue
 check=byid[p['id']];verification={k:v for k,v in check.items() if k not in ['pageText','id','name']}
 if p['application'] and p['application']['number']=='2':
  verification.update({'status':'Verified open','note':'Official PPC Manager page and Apply Now route reviewed 4 November 2026. Remote role; office option Preston. Google Ads and Microsoft Ads required. Feny’s Meta/LinkedIn portfolio does not establish these required skills. Email-only application route held under current instructions. Salary/deadline and international work eligibility not stated.','roles':[{'title':'PPC Manager','url':'https://www.fifteendesign.co.uk/careers/ppc-manager/','fit':'Adjacent paid-media experience; required Google/Microsoft Ads proficiency unverified. Candidate fit not confirmed.'}]})
 p['hiringVerification']=verification
 if p['application'] and p['application']['number']=='7':
  verification.update({'status':'Verified open','checkedAt':'2026-11-04','url':'https://beyond-co.com/job/senior-web-developer/','note':'Official live-job listing and detailed opening with active CV application form reviewed 4 November 2026. Permanent remote/anywhere. Relevant to Trayaam web engineering. WordPress/Elementor 3+ years, PHP, CSS and JavaScript required; individual candidate credentials must be matched before applying. Salary is experience-based; numeric compensation and closing date not stated. No application submitted.','roles':[{'title':'Senior Web Developer','url':'https://beyond-co.com/job/senior-web-developer/','fit':'Relevant web delivery and responsive engineering; confirm 3+ years WordPress/Elementor and PHP evidence against Akash’s current profile. Full fit not yet established.'}]})
 if p['application'] and p['application']['number'] in ['4','6']:
  verification.update({'status':'Closed / no current openings','checkedAt':'2026-11-04','note':'Official vacancy page reviewed 4 November 2026. Rak states no vacancy at the moment; The Digital Maze applicant-tracking page states no open jobs. Retain historical shortlist priority, exclude from verified-current openings.','roles':[]})
 value=json.dumps(verification,ensure_ascii=False).replace("'","''")
 sql.append(f"UPDATE records SET data=json_set(data,'$.hiringVerification',json('{value}')) WHERE id='{p['id']}';")
(private/'hiring-updates.sql').write_text('\n'.join(sql),encoding='utf-8')
# SQL upserts and local snapshot retain two recorded official-form acceptance outcomes.
for p in snapshot['prospects']:
 if p['name'].lower().startswith(('glo -','inspire digital')):
  if not p['application']:continue
  p['application']['application_status']='Submitted via official opening form; visible acceptance recorded'
  p['application']['confirmation_status']='Email receipt unverified'
  value=json.dumps(p['application'],ensure_ascii=False).replace("'","''")
  sql.append(f"UPDATE records SET data=json_set(data,'$.application',json('{value}')) WHERE id='{p['id']}';")
(private/'hiring-updates.sql').write_text('\n'.join(sql),encoding='utf-8');(private/'snapshot.json').write_text(json.dumps(snapshot,ensure_ascii=False),encoding='utf-8');print('Prepared current review evidence for',len(checks),'priority agencies')
