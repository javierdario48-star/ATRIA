// Shared acceptance contract. The experimental general registry listed an APP
// alternative that the EFFECTIVE V4 finalizer did not accept. Keep observation,
// progression and closure consistent without rewriting the original finalizer
// or manufacturing surrogate drug receipts.
import {CASE_CLOSURE_RULES_487} from '../../clinical/case-completion-487.js';
import {CARE_COVERAGE_FALLBACK_487} from '../../clinical/urgent-care-487.js';
export function antimicrobialRegimens487(c){
 const source=c?.id==='APP-001'?CASE_CLOSURE_RULES_487['APP-001'].treatment:
  c?.pharmacology?.coverageSets||c?.physiology?.coverageSets||CARE_COVERAGE_FALLBACK_487[c?.id]||[];
 return source.map(set=>[...set]);
}
