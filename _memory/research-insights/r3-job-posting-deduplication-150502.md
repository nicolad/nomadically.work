# Research Insights — job posting deduplication

## Executive Summary
The academic literature specifically focused on job posting deduplication is sparse, but one key paper provides a concrete framework and benchmark. **A Framework for Duplicate Detection from Online Job Postings (2021)** systematically compares 24 methods and identifies overlap-based similarity measures (skip‑gram and n‑gram) as the most effective. Other relevant work treats deduplication as a necessary preprocessing step within larger job‑market analysis pipelines, but EU‑specific research and implementations for remote‑work aggregation are absent.

## Papers Reviewed

### [1] A Framework for Duplicate Detection from Online Job Postings (2021, 12 citations)
- **Authors:** Yanchang Zhao, Haohui Chen, C. Mason
- **Relevance:** high
- **Domain:** Job‑board aggregation, duplicate detection
- **Key Finding:** The authors design a framework that implements 24 methods combining four tokenisers, three vectorisers, and six similarity measures. Overlap with skip‑gram (OS) and overlap with n‑gram (OG) are the top‑performing methods, outperforming a TF‑IDF‑cosine baseline.
- **Actionable Insight:** For nomadically.work, start with a simple overlap‑based similarity pipeline (e.g., using skip‑gram or n‑gram tokenisation) as a first‑line deduplication filter. This approach is lightweight, explainable, and already validated on real job‑posting data.
- **Confidence:** high
- **Source:** https://www.semanticscholar.org/paper/f9786d373ba85757e246f7897985f909ec91bb70

### [2] From Data to Insight: Transforming Online Job Postings into Labor‑Market Intelligence (2024, 8 citations)
- **Authors:** Giannis Tzimas, Nikos Zotos, Evangelos Mourelatos, Konstantinos C. Giotopoulos, Panagiotis Zervas
- **Relevance:** medium
- **Domain:** Labor‑market analysis, job‑posting processing pipelines
- **Key Finding:** Presents a comprehensive methodology for job‑posting analysis that includes data extraction, cleansing, normalization, and **deduplication** as a core step before skill and occupation extraction.
- **Actionable Insight:** Adopt a modular pipeline similar to the one described: crawl → clean → normalize → deduplicate → extract metadata (skills, location, experience). This ensures deduplication is treated as a separate, reusable component in the aggregation workflow.
- **Confidence:** medium
- **Source:** https://www.semanticscholar.org/paper/33279e62cf4d8f91b3998d753cf64cab45948bd3

### [3] Deep Learning‑based Computational Job Market Analysis: A Survey on Skill Extraction and Classification from Job Postings (2024, 19 citations)
- **Authors:** Elena Senger, Mike Zhang, Rob van der Goot, Barbara Plank
- **Relevance:** low (for deduplication), high for skill extraction
- **Domain:** NLP, skill extraction, job‑posting classification
- **Key Finding:** This survey catalogues deep‑learning methods and datasets for skill extraction, noting that consistent skill taxonomies (like ESCO) are crucial for reliable job‑posting analysis.
- **Actionable Insight:** Use skill‑extraction techniques (e.g., named‑entity recognition on ESCO terms) to enrich job‑posting representations. Skill vectors can then be used as additional features in duplicate detection, helping to disambiguate postings that have similar text but different skill requirements.
- **Confidence:** medium
- **Source:** https://www.semanticscholar.org/paper/a833fc800b4a9b15c6b7a4efb408bf19cd11efef

### [4] NLP‑Based Bi‑Directional Recommendation System: Towards Recommending Jobs to Job Seekers and Resumes to Recruiters (2022, 35 citations)
- **Authors:** S. Alsaif, Minyar Sassi Hidri, Imen Ferjani, Hassan Ahmed Eleraky, Adel Hidri
- **Relevance:** medium
- **Domain:** Job‑recommendation systems, similarity matching
- **Key Finding:** Proposes a bi‑direction matching system that calculates similarity scores by integrating explicit and implicit job‑information features (e.g., title, skills, location) using NLP techniques.
- **Actionable Insight:** Leverage multi‑feature similarity scoring (title, company, location, skills) for duplicate detection. A weighted combination of these features may be more robust than pure text‑overlap methods, especially for postings that differ slightly in wording but refer to the same job.
- **Confidence:** medium
- **Source:** https://www.semanticscholar.org/paper/9fb87d9fb6162ba796281cc84336ea37ae085d4f

### [5] Duplicate Bug Report Detection by Using Sentence Embedding and Fine‑tuning (2021, 24 citations)
- **Authors:** Haruna Isotani, H. Washizaki, Y. Fukazawa, Tsutomu Nomoto, Saori Ouji, Shinobu Saito
- **Relevance:** low (domain transfer)
- **Domain:** Software engineering, bug‑report deduplication
- **Key Finding:** Uses Sentence‑BERT fine‑tuned on domain‑specific text to generate sentence embeddings, then calculates similarity between entire reports. Fine‑tuning on in‑domain data significantly improves detection accuracy.
- **Actionable Insight:** For advanced near‑duplicate detection, consider fine‑tuning a sentence‑embedding model (e.g., Sentence‑BERT) on a labelled dataset of job postings. This could capture semantic similarities that lexical methods miss, such as paraphrased job descriptions.
- **Confidence:** low (technique is promising but requires labelled job‑posting data)
- **Source:** https://www.semanticscholar.org/paper/e0119186a44e3334bf3d15a703d26041f58e303b

## Aggregated Insights

| Insight | Source Papers | Implementation Priority |
|---------|---------------|------------------------|
| Start with overlap‑based similarity (skip‑gram/n‑gram tokenisation) as a baseline deduplicator. | [1] | P0 (immediate) |
| Build a modular pipeline that separates deduplication from cleaning and metadata extraction. | [2] | P0 |
| Enrich job‑posting representations with extracted skills (using ESCO taxonomy) to improve duplicate discrimination. | [3] | P1 |
| Use multi‑feature similarity scoring (title, company, location, skills) rather than single‑text similarity. | [4] | P1 |
| Explore fine‑tuned sentence embeddings (e.g., Sentence‑BERT) for semantic near‑duplicate detection. | [5] | P2 |

## Implementation Roadmap

### P0 (Immediate — This Week)
- **Implement overlap‑based deduplication:** Use skip‑gram or n‑gram tokenisation (as per [1]) to compute text similarity between postings. Set a conservative similarity threshold (e.g., 0.8) to flag duplicates.
- **Design a modular pipeline:** Separate deduplication into its own service that receives cleaned, normalized postings and returns duplicate clusters.
- **Add basic metadata matching:** Include exact matches on company name, job title, and location as a first‑pass filter before text similarity.

### P1 (Next Sprint)
- **Integrate skill extraction:** Use an off‑the‑shelf ESCO‑based NER model to extract skills from each posting. Incorporate skill‑set similarity (Jaccard index) into the overall duplicate score.
- **Implement weighted multi‑feature similarity:** Combine title, company, location, and skill similarities with learnable weights (initially set by domain knowledge).
- **Collect labelled data:** Manually label a small set of duplicate/non‑duplicate pairs from nomadically.work’s own aggregated postings to evaluate and tune the system.

### P2 (Backlog)
- **Explore deep‑learning embeddings:** Fine‑tune a Sentence‑BERT model on the labelled duplicate pairs to capture semantic paraphrasing.
- **Multilingual deduplication:** Investigate methods for handling duplicate postings across different EU languages (e.g., using multilingual embeddings).
- **Real‑time deduplication:** Optimise the pipeline for streaming aggregation, possibly using locality‑sensitive hashing (LSH) for scalable similarity search.

## Open Questions
- **Threshold tuning:** What similarity threshold maximises precision/recall for remote EU job postings?
- **Cross‑language duplicates:** How to detect duplicates when the same job is posted in English, German, and French?
- **Temporal aspects:** Should duplicates be detected only within a certain time window (e.g., 30 days)?
- **ATS‑specific formatting:** How to normalise postings that come from different Applicant Tracking Systems (ATS) with vastly different HTML structures and boilerplate?

## Confidence Assessment
- **Total papers reviewed:** 5
- **With code/benchmarks:** 1 ([1] provides a full framework and evaluation)
- **EU‑specific:** 0 (none of the papers focus on EU remote‑work aggregation or ESCO in deduplication)
- **Overall confidence:** **40%** – While one paper offers a strong foundation, the literature is extremely limited for the specific context of remote EU job‑board aggregation. Most insights are extrapolated from broader job‑market analysis or duplicate‑detection in other domains. Practical implementation will require extensive experimentation with nomadically.work’s own data.