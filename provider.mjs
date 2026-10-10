import {setTimeout as delay} from 'node:timers/promises';

export class ProviderError extends Error {
  constructor(message, status=502) { super(message); this.status=status; }
}

// Retry only interpretation: repeating a music request could consume credits twice.
export async function upstream(url,key,header,data,timeout,{provider,retries=0,fetchImpl=fetch,sleep=delay}={}) {
  for(let attempt=0;attempt<=retries;attempt++) {
    let response, payload;
    try {
      response=await fetchImpl(url,{method:'POST',headers:{[header]:key,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(timeout)});
      // Read the body inside the timeout handling, not just the response headers.
      payload=await response.arrayBuffer();
    } catch {
      console.warn(`${provider}: network/timeout, attempt ${attempt+1}`);
      if(attempt<retries) { await sleep(1500*2**attempt); continue; }
      throw new ProviderError(`${provider} did not respond in time or could not be reached. Your image and selection are still here. Wait a moment, then try again.`,504);
    }
    if(response.ok) return new Response(payload,{status:response.status,headers:response.headers});
    console.warn(`${provider}: HTTP ${response.status}, attempt ${attempt+1}`);
    if([500,502,503,504].includes(response.status)&&attempt<retries) { await sleep(1500*2**attempt); continue; }
    if(response.status===401||response.status===403) throw new ProviderError(`${provider} denied API access. Check the key permissions and account access. No billing changes were made.`,502);
    if(response.status===402) throw new ProviderError(`${provider} requires credits or paid access. Generation stopped; no payment was made.`,402);
    if(response.status===429) throw new ProviderError(`${provider}'s quota or rate limit was reached. Wait before retrying; check the free-tier quota or included credits if it continues.`,429);
    if([500,502,503,504].includes(response.status)) throw new ProviderError(`${provider} is temporarily unavailable (HTTP ${response.status})${retries?' even after one automatic retry':''}. Your selection is saved on this page. Wait a minute, then try again.`,503);
    throw new ProviderError(`${provider} could not complete this request (HTTP ${response.status}).`,502);
  }
}
