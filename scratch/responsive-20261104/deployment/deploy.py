from pathlib import Path
import json,subprocess,shlex,sys
base=Path(__file__).resolve().parent
plan=json.loads((base/'deploy-plan.json').read_text())
manifest=json.loads((base/'release-manifest.json').read_text())
assert plan['host']=='root@109.123.239.182' and plan['live']=='/var/www/web/dist'
assert plan['staging'].startswith('/root/deploy-staging/web-responsive-')
ssh=['C:/Windows/System32/OpenSSH/ssh.exe','-o','BatchMode=yes','-o','ConnectTimeout=15','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=3',plan['host']]
def remote(command,stdin=None):
 result=subprocess.run(ssh+[command],stdin=stdin,capture_output=True,timeout=240)
 if result.returncode:
  sys.stderr.write(result.stderr.decode('utf-8','replace'));sys.stdout.write(result.stdout.decode('utf-8','replace'));raise SystemExit(result.returncode)
 return result.stdout.decode('utf-8')
def parse(data):
 result={}
 for line in data.splitlines():
  digest,name=line.split(None,1); result[name.strip().removeprefix('./')]=digest
 return result
if sys.argv[1]=='upload':
 stage=shlex.quote(plan['staging'])
 remote(f"set -eu; test $(df -Pk /var/www/web/dist | awk 'NR==2 {{print $4}}') -gt 262144; mkdir -p /root/deploy-staging; mkdir {stage}")
 print('Created unique staging directory',flush=True)
 with (base/'release.tgz').open('rb') as archive: remote(f'tar -xzf - -C {stage}',stdin=archive)
 actual=parse(remote(f'cd {stage} && find . -type f -print0 | sort -z | xargs -0 sha256sum'))
 if actual!=manifest: raise SystemExit('Staging checksums do not match the release; live site unchanged')
 print(f'Uploaded and verified all {len(actual)} staged files. Live site unchanged.',flush=True)
elif sys.argv[1]=='activate':
 with (base/'activate.sh').open('rb') as script: print(remote('bash -s',stdin=script),end='')
elif sys.argv[1]=='verify':
 actual=parse(remote('cd /var/www/web/dist && find . -type f -print0 | sort -z | xargs -0 sha256sum'))
 bad=[k for k,v in manifest.items() if actual.get(k)!=v]
 before=parse((base.parent/'live-before.sha256').read_text(encoding='utf-8-sig'))
 missing_old=[k for k in before if k not in actual]
 changed_old=[k for k,v in before.items() if k!='index.html' and actual.get(k)!=v]
 (base/'live-after.json').write_text(json.dumps(actual,indent=2))
 assert not bad and not missing_old and not changed_old, {'release_mismatches':bad,'missing_old':missing_old,'changed_old':changed_old}
 print(f'All {len(manifest)} release files match production. All {len(before)-1} previous non-HTML files retained unchanged. Live files: {len(actual)}.')
else: raise SystemExit('Unknown deployment action')
