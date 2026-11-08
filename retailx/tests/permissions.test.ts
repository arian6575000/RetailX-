import assert from 'node:assert/strict';
import { FEATURE_DEFAULTS, featureOn } from '../src/license/permissions';
import spec from '../src/license/permissions.json';
import { ACTION_FEATURE } from '../src/lib/roles';
assert.equal(featureOn({}, 'pos.billing'), true);                          // not mentioned -> schema default
assert.equal(featureOn({ 'reports.view': false }, 'reports.view'), false);  // license says no
assert.equal(featureOn(undefined, 'backup.export'), true);
assert.equal(featureOn({}, 'not.in.schema'), false);
assert.equal(spec.project.code, 'retailx-register');
// every license feature used by roles.ts exists in the schema (typo guard)
for (const f of Object.values(ACTION_FEATURE)) if (f) assert.ok(f in FEATURE_DEFAULTS, `unknown feature ${f}`);
console.log('permissions tests passed');
