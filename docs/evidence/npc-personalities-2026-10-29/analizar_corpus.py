"""Reproduce the controlled comparisons from the native Actions corpus.

Usage: python analizar_corpus.py /path/to/anamneses.jsonl.gz
Only standard-library modules are needed. No game simulation is performed.
"""
import collections
import gzip
import itertools
import json
import re
import sys
import unicodedata


def normalize(text):
    text = ''.join(c for c in unicodedata.normalize('NFD', text)
                   if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'\s+', ' ', re.sub('[^a-z0-9 ]', ' ', text)).strip()


def body(row, primary=False):
    return normalize(' '.join(
        fact['spoken'] for turn in row['rows']
        for fact in (turn.get('evidence') or {}).get('facts', [])
        if not primary or not fact.get('spontaneous')))


def trigrams(text):
    words = text.split()
    return set(zip(words, words[1:], words[2:]))


def analyze(filename):
    groups = collections.defaultdict(list)
    rates = collections.defaultdict(collections.Counter)
    counts = collections.Counter()
    full_conversations, full_speech_bodies = set(), set()
    with gzip.open(filename, 'rt', encoding='utf8') as corpus:
        for line in corpus:
            row = json.loads(line)
            eligible = any(turn.get('evidence') and
                           turn['evidence'].get('styleApplied') and
                           not turn['evidence'].get('limited')
                           for turn in row['rows'])
            text, primary = body(row), body(row, primary=True)
            key = (row['caseId'], row['doctor'], row['clinicalInvariant'],
                   tuple(turn['question'] for turn in row['rows']))
            groups[key].append((row['signature'], text, trigrams(text),
                                primary, trigrams(primary), eligible))
            full_conversations.add(normalize(' '.join(
                turn['answer'].removeprefix('Hola, doctor. ')
                for turn in row['rows'])))
            if eligible:
                full_speech_bodies.add(text)
            rates[row['archetype']]['interviews'] += 1
            seen = {}
            for turn in row['rows']:
                evidence = turn.get('evidence') or {}
                facts = evidence.get('facts', [])
                counts['turns'] += 1
                if not facts:
                    counts['turnsWithoutFactualEvidence'] += 1
                if evidence.get('remark'):
                    counts['emotionalRemarks'] += 1
                    if '?' in evidence['remark']:
                        counts['emotionalQuestions'] += 1
                        rates[row['archetype']]['emotionalQuestions'] += 1
                        if evidence.get('topic') not in ('reason', 'symptoms') and not evidence.get('repeat'):
                            counts['questionsOutsideDeclaredContext'] += 1
                rates[row['archetype']]['spontaneousFacts'] += sum(
                    bool(fact.get('spontaneous')) for fact in facts)
                signature = tuple((fact['id'], fact['canonical'])
                                  for fact in facts if not fact.get('spontaneous'))
                spoken = normalize(' '.join(fact['spoken'] for fact in facts
                                           if not fact.get('spontaneous')))
                if evidence.get('styleApplied') and signature:
                    if signature in seen:
                        counts['repeatTurnsEligibleForVariation'] += 1
                        if seen[signature] != spoken:
                            counts['repeatTurnsWithDifferentFormulation'] += 1
                    seen[signature] = spoken

    comparisons = {key: collections.Counter() for key in ('all', 'fullSpeech')}
    for rows in groups.values():
        for left, right in itertools.combinations(rows, 2):
            if left[0] == right[0]:
                continue
            kinds = ['all'] + (['fullSpeech'] if left[5] and right[5] else [])
            for kind in kinds:
                result = comparisons[kind]
                result['pairs'] += 1
                for index, name in ((2, 'body'), (4, 'primaryFacts')):
                    union = len(left[index] | right[index])
                    score = len(left[index] & right[index]) / union if union else 1
                    result[name + 'SimilaritySum'] += score
                    result[name + 'NearIdenticalPairs'] += score >= .94
                result['exactBodies'] += left[1] == right[1]
    for result in comparisons.values():
        for name in ('body', 'primaryFacts'):
            result[name + 'MeanTrigramJaccard'] = result.pop(name + 'SimilaritySum') / result['pairs']
            result[name + 'NearIdenticalFraction'] = result[name + 'NearIdenticalPairs'] / result['pairs']
    return {
        'method': 'All within-case pairs with identical clinical-invariant digest, identical doctor style, identical fifteen-question schedule and different behavioral signatures. No greetings, punctuation or emotional remarks earn body diversity.',
        'controlledComparison': comparisons,
        'utteranceCounts': counts,
        'archetypeCounts': rates,
        'uniqueFullUtterancesAcrossConversations': len(full_conversations),
        'uniqueFullSpeechSubstantiveBodies': len(full_speech_bodies),
        'limitations': [
            'Authored clinical facts remain shared by design. Physical or neurological impairment intentionally restricts personality expression.',
            'Unique full utterances include meaningful emotional variation; the stricter substantive-body count excludes it.'
        ]
    }


if __name__ == '__main__':
    print(json.dumps(analyze(sys.argv[1]), ensure_ascii=False, indent=2))
