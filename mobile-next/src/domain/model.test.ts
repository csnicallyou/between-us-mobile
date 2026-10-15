import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,makeEntry,saveEntry,visible,parseQuick,validateEntry} from './model';
test('private partner records never leak into shared selectors',()=>{assert.equal(visible(makeEntry('diary','Hidden',{owner:'partner'}),true),false);assert.equal(visible(makeEntry('event','Allowed',{owner:'partner',visibility:'shared'}),true),true);});
test('editing preserves prior version and entity identity',()=>{let s=seed();const e=s.entries[0]!;s=saveEntry(s,{...e,title:'Changed'});assert.equal(s.entries.length,seed().entries.length);assert.equal(s.entries[0]!.versions[0]!.title,e.title);});
test('offline parsing handles tomorrow across month boundary',()=>{assert.equal(parseQuick('Купить чай завтра','2026-10-31').date,'2026-11-01');assert.equal(parseQuick('Купить чай').kind,'task');});
test('invalid dates and expenses cannot be saved',()=>{assert.ok(validateEntry(makeEntry('event','x',{date:'2026-02-31'})));assert.ok(validateEntry(makeEntry('expense','x',{amount:NaN})));});
