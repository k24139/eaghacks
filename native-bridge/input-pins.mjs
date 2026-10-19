import {createHash} from 'node:crypto';

/** Only known client builds may vary; assets and worker payloads keep their original pins. */
export function matchesPayloadPin(id,bytes,inputs){
 const original=inputs.payloads[id];if(!original)return false;
 const candidates=[original];
 if(id==='eag-inline-wasm-br')candidates.push(...(inputs.rebuiltClients??[]).filter(pin=>pin.upstream===inputs.upstream));
 const sha256=createHash('sha256').update(bytes).digest('hex');
 return candidates.some(pin=>pin.bytes===bytes.length&&pin.sha256===sha256);
}
