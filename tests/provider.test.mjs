import test from 'node:test';
import assert from 'node:assert/strict';
import {upstream} from '../provider.mjs';
const run=(fetchImpl,options={})=>upstream('https://example.invalid','test-only','x-key',{},10,{provider:'Gemini',retries:1,sleep:async()=>{},fetchImpl,...options});
test('503 retries once and can recover',async()=>{
 let calls=0;const result=await run(async()=>new Response(++calls===1?'busy':'{"ok":true}',{status:calls===1?503:200}));
 assert.equal(calls,2);assert.deepEqual(await result.json(),{ok:true});
});
test('persistent overload stops after two attempts with useful status',async()=>{
 let calls=0;await assert.rejects(run(async()=>{calls++;return new Response('busy',{status:503});}),e=>e.status===503&&e.message.includes('Gemini')&&e.message.includes('retry'));
 assert.equal(calls,2);
});
test('timeout while reading body is handled and bounded',async()=>{
 let calls=0;await assert.rejects(run(async()=>{calls++;return {arrayBuffer:async()=>{throw new Error('timeout');}};}),e=>e.status===504);assert.equal(calls,2);
});
test('quota and denied access are never automatically retried',async()=>{
 for(const status of [429,401,403,402]){let calls=0;await assert.rejects(run(async()=>{calls++;return new Response('failure',{status});}));assert.equal(calls,1);}
});
test('music is never automatically retried',async()=>{
 let calls=0;await assert.rejects(run(async()=>{calls++;return new Response('busy',{status:503});},{provider:'ElevenLabs',retries:0}),e=>e.message.includes('ElevenLabs'));assert.equal(calls,1);
});
