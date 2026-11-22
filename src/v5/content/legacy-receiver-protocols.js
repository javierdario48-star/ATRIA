// Public transport metadata for legacy seeds whose native disposition owner
// predates declarative closure policies. No patient is registered or changed.
export const LEGACY_RECEIVER_PROTOCOLS=Object.freeze({
 'PERI-PBE-001':{destinations:['sala','uti'],consult:{uti:['uti']}},
 'PERI-SEC-001':{destinations:['quirofano'],consult:{quirofano:['cirugia']}},
 'PERI-TER-001':{destinations:['sala','uti','quirofano'],consult:{uti:['uti'],quirofano:['cirugia']}}
});
